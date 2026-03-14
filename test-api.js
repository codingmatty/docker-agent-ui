#!/usr/bin/env node
/**
 * test-api.js — Interactive Docker Agent API tester
 *
 * Hits the Docker Agent API directly (bypassing the UI proxy).
 * Useful for understanding how the SSE stream + resume flow works.
 *
 * Usage:
 *   node test-api.js [base-url]
 *
 * Defaults to http://127.0.0.1:8080
 */

import readline from "readline";

const BASE = (process.argv[2] || "http://127.0.0.1:8080").replace(/\/$/, "");

// ── Helpers ──────────────────────────────────────────────────────────────────

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const ask = (q) => new Promise((res) => rl.question(q, res));

async function api(path, options = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${path}: ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function dim(s) {
  return `\x1b[2m${s}\x1b[0m`;
}
function cyan(s) {
  return `\x1b[36m${s}\x1b[0m`;
}
function yellow(s) {
  return `\x1b[33m${s}\x1b[0m`;
}
function green(s) {
  return `\x1b[32m${s}\x1b[0m`;
}
function red(s) {
  return `\x1b[31m${s}\x1b[0m`;
}
function bold(s) {
  return `\x1b[1m${s}\x1b[0m`;
}

function printEvent(event) {
  const prefix = dim(`[${event.type}]`);
  switch (event.type) {
    case "stream_started":
      console.log(prefix, cyan("stream started"));
      break;
    case "stream_stopped":
      console.log(prefix, cyan("stream stopped"));
      break;
    case "agent_choice":
      process.stdout.write(event.content ?? "");
      break;
    case "tool_call":
      console.log("\n" + prefix, yellow(JSON.stringify(event, null, 2)));
      break;
    case "tool_call_confirmation":
      console.log("\n" + prefix, yellow(JSON.stringify(event, null, 2)));
      break;
    case "tool_call_response":
      console.log("\n" + prefix, dim(JSON.stringify(event, null, 2)));
      break;
    case "error":
      console.log("\n" + prefix, red(event.message ?? JSON.stringify(event)));
      break;
    default:
      console.log("\n" + prefix, dim(JSON.stringify(event)));
  }
}

/**
 * Consume an SSE stream, calling onEvent for each parsed event.
 * Returns when the stream closes or a tool_call_confirmation is received.
 * Returns the last event type so the caller knows why it stopped.
 */
async function consumeSSE(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastEventType = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let event;
      try {
        event = JSON.parse(line.slice(6));
      } catch {
        continue;
      }
      onEvent(event);
      lastEventType = event.type;
      if (event.type === "tool_call_confirmation") {
        // The SSE stream stays open — the server is just paused waiting for
        // /resume. Return the confirmation so the caller can send it, then
        // the caller must continue draining the same stream.
        return { stopped: false, confirmation: event, reader };
      }
      if (event.type === "stream_stopped") {
        return { stopped: true, confirmation: null };
      }
    }
  }
  // Stream closed by server without stream_stopped
  return { stopped: false, confirmation: null, lastEventType, reader: null };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(bold(`\nDocker Agent API Tester`));
  console.log(dim(`Target: ${BASE}\n`));

  // 1. List agents
  console.log("Fetching agents...");
  let agents;
  try {
    agents = await api("/agents");
  } catch (e) {
    console.error(red(`Failed to reach API: ${e.message}`));
    console.error(
      dim("Is the Docker Agent running? Check DOCKER_AGENT_API_URL."),
    );
    rl.close();
    process.exit(1);
  }
  console.log("Available agents:");
  agents.forEach((a, i) =>
    console.log(
      `  ${i + 1}. ${cyan(a.name)}${a.description ? dim(` — ${a.description}`) : ""}`,
    ),
  );

  const agentChoice = await ask(
    `\nPick agent [1-${agents.length}] (default: 1): `,
  );
  const agent =
    agents[Math.max(0, parseInt(agentChoice || "1", 10) - 1)] ?? agents[0];
  console.log(dim(`Using: ${agent.name}\n`));

  // 2. Create session
  console.log("Creating session...");
  const session = await api("/sessions", { method: "POST", body: "{}" });
  console.log(green(`Session created: ${session.id}\n`));

  const messages = [];

  // 3. Conversation loop
  while (true) {
    const userInput = await ask(bold("You: "));
    if (!userInput.trim() || userInput === "/exit" || userInput === "/quit")
      break;

    messages.push({ role: "user", content: userInput });

    process.stdout.write(bold("Agent: "));

    // 4. Run agent (SSE)
    const runRes = await fetch(
      `${BASE}/sessions/${session.id}/agent/${agent.name}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages),
      },
    );

    if (!runRes.ok) {
      const text = await runRes.text();
      console.error(red(`\nAgent run failed: ${text}`));
      continue;
    }

    let agentContent = "";
    const onEvent = (event) => {
      if (event.type === "agent_choice") agentContent += event.content ?? "";
      printEvent(event);
    };

    let result = await consumeSSE(runRes, onEvent);

    // Handle tool confirmations — the SSE stream stays open, so we loop
    while (result.confirmation) {
      const { confirmation, reader } = result;

      console.log("\n" + yellow(bold("⚠  Tool call confirmation required")));
      console.log(dim("Event: ") + JSON.stringify(confirmation, null, 2));
      console.log(dim("\nValid options: approve / approve-session / approve-tool / reject"));

      const decision = await ask("Confirmation [approve]: ");
      const confirmationType = decision.trim() || "approve";
      let reason;
      if (confirmationType === "reject") {
        reason = await ask("Rejection reason (optional): ");
      }

      console.log(dim(`\nSending resume (confirmation=${confirmationType})...`));
      const resumeStart = Date.now();
      try {
        const resumeResult = await api(`/sessions/${session.id}/resume`, {
          method: "POST",
          body: JSON.stringify({ confirmation: confirmationType, ...(reason ? { reason } : {}) }),
        });
        const elapsed = Date.now() - resumeStart;
        console.log(green(`Resume returned in ${elapsed}ms`));
        console.log(dim("Response body: ") + JSON.stringify(resumeResult));
      } catch (e) {
        console.error(red(`Resume failed: ${e.message}`));
        break;
      }

      // Continue consuming the same open SSE stream
      console.log(dim("\nContinuing stream...\n"));
      result = await consumeSSE({ body: { getReader: () => reader } }, onEvent);
    }

    console.log(
      "\n" + dim(`─── stream ended (stopped=${result.stopped}, lastEventType=${result.lastEventType ?? "n/a"}) ───`),
    );

    if (agentContent) {
      messages.push({ role: "assistant", content: agentContent });
    }

    // 6. Print current session state
    const detail = await api(`/sessions/${session.id}`);
    const msgCount = (detail.messages ?? detail.Messages ?? []).length;
    console.log(dim(`\nSession now has ${msgCount} raw message(s) on server.\n`));
  }

  // Cleanup
  const cleanup = await ask(
    `\nDelete test session ${session.id}? [y/n] (default: n): `,
  );
  if (cleanup.trim().toLowerCase() === "y") {
    await api(`/sessions/${session.id}`, { method: "DELETE" });
    console.log(green("Session deleted."));
  }

  rl.close();
}

main().catch((e) => {
  console.error(red(`Fatal: ${e.message}`));
  rl.close();
  process.exit(1);
});
