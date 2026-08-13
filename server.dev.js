/**
 * Custom dev server: Next.js + WebSocket for auto-refresh on file change.
 * Run with: npm run dev
 * Only used in development.
 */

const { createServer } = require('http');
const next = require('next');
const { WebSocketServer } = require('ws');
const chokidar = require('chokidar');
const path = require('path');

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

const DEV_RELOAD_PATH = '/_next/dev-reload';

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const nextUpgradeHandler = app.getUpgradeHandler();

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === DEV_RELOAD_PATH) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      // Encaminha HMR (webpack-hmr, turbopack, etc.) para o Next.js
      nextUpgradeHandler(request, socket, head).catch((err) => {
        console.error('[dev] HMR upgrade error:', err.message);
        socket.destroy();
      });
    }
  });

  const clients = new Set();
  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
  });

  function broadcastReload() {
    const message = JSON.stringify({ type: 'reload' });
    clients.forEach((ws) => {
      if (ws.readyState === 1) ws.send(message);
    });
  }

  const watchDirs = [
    path.join(__dirname, 'app'),
    path.join(__dirname, 'components'),
    path.join(__dirname, 'lib'),
    path.join(__dirname, 'public'),
  ].filter((dir) => require('fs').existsSync(dir));

  const watcher = chokidar.watch(watchDirs, {
    ignored: /(^|[/\\])\..|node_modules|\.next/,
    ignoreInitial: true,
  });

  watcher.on('change', (filePath) => {
    console.log('[dev] changed:', path.relative(__dirname, filePath));
    broadcastReload();
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
    console.log(`> Auto-refresh at ws://localhost:${port}${DEV_RELOAD_PATH}`);
  });
});
