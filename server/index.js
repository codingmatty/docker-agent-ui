import 'dotenv/config';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Normalize: no trailing slash so we don't get double slashes
const rawUrl = (process.env.DOCKER_AGENT_API_URL || 'http://127.0.0.1:8080').trim().replace(/\/$/, '');
const DOCKER_AGENT_API_URL = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
  ? rawUrl
  : 'http://' + rawUrl;
const PORT = Number(process.env.PORT) || 3000;

try {
  const u = new URL(DOCKER_AGENT_API_URL);
  console.log('Docker Agent API target:', DOCKER_AGENT_API_URL, '(host:', u.hostname + ', port:', u.port || (u.protocol === 'https:' ? '443' : '80') + ')');
} catch (e) {
  console.error('Invalid DOCKER_AGENT_API_URL:', DOCKER_AGENT_API_URL, e.message);
}

const app = express();

// Proxy /api to the Docker Agent API. Use pathFilter so the full path (/api/agents etc.) is forwarded.
app.use(
  createProxyMiddleware({
    pathFilter: (pathname) => pathname.startsWith('/api'),
    target: DOCKER_AGENT_API_URL,
    changeOrigin: true,
    on: {
      error(err, req, res) {
        const msg = err.code === 'ECONNREFUSED'
          ? 'Connection refused. Is the Docker Agent API running at ' + DOCKER_AGENT_API_URL + '?'
          : err.code === 'ENOTFOUND'
            ? 'Host not found for ' + DOCKER_AGENT_API_URL
            : err.code === 'EHOSTUNREACH'
              ? 'Host unreachable. Check DOCKER_AGENT_API_URL in .env (use 127.0.0.1:8080 for local agent).'
              : err.message || 'Could not reach Docker Agent API.';
        console.error('Proxy error:', err.code || err.message, err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad Gateway', message: msg }));
      },
    },
  })
);

// Health check for the UI server (not the agent)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'docker-agent-ui' });
});

// Serve static frontend when built (Vite build output)
const distPath = path.join(__dirname, '..', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/assets')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
} else {
  app.get('/', (req, res) => {
    res.send('Docker Agent UI: run "npm run build" then restart, or use "npm run dev" and open http://localhost:5173');
  });
}

app.listen(PORT, () => {
  console.log(`Docker Agent UI server listening on http://localhost:${PORT}`);
  console.log(`Proxying /api to ${DOCKER_AGENT_API_URL}`);
});
