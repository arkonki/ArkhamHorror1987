/**
 * Arkham Horror online server: WebSocket rooms at /ws and the built app (dist/) over HTTP.
 *   PORT (default 3001), DATA_DIR (default ./data/rooms), STATIC_DIR (default ./dist)
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ClientMsg } from '../src/net/protocol';
import { RoomManager, type Conn } from './rooms';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

export function startServer(opts: { port: number; dataDir: string | null; staticDir: string | null }): Promise<{ server: Server; rooms: RoomManager; port: number }> {
  const rooms = new RoomManager(opts.dataDir);
  const root = opts.staticDir ? resolve(opts.staticDir) : null;

  const server = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain' }).end('ok');
      return;
    }
    if (!root || !existsSync(root)) {
      res.writeHead(404).end('Run `npm run build` to serve the app from this server.');
      return;
    }
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = normalize(join(root, url));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html'); // SPA fallback
    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    const cache = file.includes(`${root}/assets/index-`) ? 'public, max-age=31536000, immutable' : 'no-cache';
    res.writeHead(200, { 'content-type': type, 'cache-control': cache });
    createReadStream(file).pipe(res);
  });

  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 256 * 1024 });
  wss.on('connection', (ws: WebSocket) => {
    const conn: Conn = {
      token: '', name: '', room: null,
      send: (msg) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(msg)),
    };
    let alive = true;
    ws.on('pong', () => (alive = true));
    const ping = setInterval(() => {
      if (!alive) return ws.terminate();
      alive = false;
      ws.ping();
    }, 30000);
    ws.on('message', (data) => {
      let msg: ClientMsg;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return conn.send({ t: 'error', msg: 'Bad message.' });
      }
      try {
        rooms.handle(conn, msg);
      } catch (e) {
        console.error('room error', e);
        conn.send({ t: 'error', msg: 'Server error.' });
      }
    });
    ws.on('close', () => {
      clearInterval(ping);
      rooms.disconnect(conn);
    });
  });

  return new Promise((ok) => server.listen(opts.port, () => {
    const addr = server.address();
    ok({ server, rooms, port: typeof addr === 'object' && addr ? addr.port : opts.port });
  }));
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const port = Number(process.env.PORT ?? 3001);
  startServer({ port, dataDir: process.env.DATA_DIR || 'data/rooms', staticDir: process.env.STATIC_DIR || 'dist' })
    .then(({ port: p }) => console.log(`Arkham Horror server on http://localhost:${p} (WebSocket /ws)`));
}
