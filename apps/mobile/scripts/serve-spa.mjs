#!/usr/bin/env node
/**
 * Local preview of the production web build, mirroring the Nginx setup in docs/DEPLOYMENT.md:
 * static files from dist/ with SPA fallback to index.html, and /api (including Socket.IO) proxied to the API.
 *   node scripts/serve-spa.mjs [port] [apiOrigin]
 */
import http from 'node:http';
import net from 'node:net';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const port = Number(process.argv[2] ?? 8081);
const api = new URL(process.argv[3] ?? 'http://127.0.0.1:3000');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.glb': 'model/gltf-binary',
  '.webmanifest': 'application/manifest+json',
};

function proxy(req, res) {
  const upstream = http.request(
    { host: api.hostname, port: api.port, path: req.url, method: req.method, headers: { ...req.headers, host: api.host } },
    (r) => {
      res.writeHead(r.statusCode ?? 502, r.headers);
      r.pipe(res);
    },
  );
  upstream.on('error', () => {
    res.writeHead(502);
    res.end('API unavailable');
  });
  req.pipe(upstream);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://local');
  if (url.pathname.startsWith('/api/')) return proxy(req, res);
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (!file.startsWith(root)) {
    res.writeHead(403);
    return res.end();
  }
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
  } catch {
    file = path.join(root, 'index.html'); // SPA fallback, same as Nginx try_files
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

// WebSocket upgrade for Socket.IO under /api/socket.io
server.on('upgrade', (req, socket, head) => {
  socket.on('error', () => socket.destroy());
  const upstream = net.connect(Number(api.port), api.hostname, () => {
    const headers = Object.entries(req.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\r\n');
    upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${headers}\r\n\r\n`);
    upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
});

server.listen(port, () => console.log(`SPA preview on http://localhost:${port} (API ${api.origin})`));
