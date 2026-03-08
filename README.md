# Docker Agent UI

A web UI for [Docker Agent](https://docker.github.io/docker-agent/) that talks to the Agent **API** and behaves similarly to the built-in **TUI**. The Docker Agent API is not exposed to the browser; a small proxy server forwards requests.

## Features

- **Sessions**: Create, list, switch, delete, and edit session titles.
- **Agents**: List and select which agent to run (from the API).
- **Chat**: Send messages and stream assistant replies (SSE).
- **Tool approval**: When the agent requests a tool call, approve or deny in a modal.
- **YOLO mode**: Toggle auto-approve for tool calls (per session).
- **Themes**: Switch UI theme (dark, light, nord, dracula, etc.).
- **Slash command**: `/new` to start a new conversation.

No database or login: sessions live in the Docker Agent API (and its session store).

## Setup

1. **Run the Docker Agent API** (not exposed to the internet):

   ```bash
   docker agent serve api agent.yaml --listen 127.0.0.1:8080
   ```

2. **Configure and run this UI**:

   ```bash
   cp .env.example .env
   # Edit .env: set DOCKER_AGENT_API_URL=http://127.0.0.1:8080
   npm install
   npm run dev
   ```

   - Proxy + UI server: [http://localhost:3000](http://localhost:3000)
   - In dev, the Vite dev server runs on [http://localhost:5173](http://localhost:5173) and proxies `/api` to the server on 3000. Use 5173 for dev with HMR.

   For production-style run (build + serve from server):

   ```bash
   npm run build
   DOCKER_AGENT_API_URL=http://127.0.0.1:8080 PORT=3000 npm start
   ```

   Then open [http://localhost:3000](http://localhost:3000).

## Environment

| Variable               | Default                 | Description                        |
| ---------------------- | ----------------------- | ---------------------------------- |
| `DOCKER_AGENT_API_URL` | `http://127.0.0.1:8080` | Base URL of the Docker Agent API.  |
| `PORT`                 | `3000`                  | Port for this UI (proxy + static). |

## API reference

The UI uses the [Docker Agent API](https://docker.github.io/docker-agent/features/api-server/) via the proxy: agents, sessions, agent execution (SSE), resume, tools/toggle, etc.
