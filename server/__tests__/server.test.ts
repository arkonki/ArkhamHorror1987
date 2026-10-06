import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { Session } from '../../src/engine/session';
import { DEFAULT_OPTIONS } from '../../src/engine/state';
import type { Setup } from '../../src/engine';
import { seatForPrompt, type ClientMsg, type ServerMsg } from '../../src/net/protocol';
import { startServer } from '../index';

const setup: Setup = {
  seed: 7,
  players: [{ name: 'Ann' }, { name: 'Bob' }],
  investigators: [{ defId: 'joe_diamond', player: 0, str: 5 }, { defId: 'harvey_walters', player: 1, str: 5 }],
  options: { ...DEFAULT_OPTIONS, orientMonsters: false },
};

class Client {
  ws: WebSocket;
  inbox: ServerMsg[] = [];
  waiters: (() => void)[] = [];
  constructor(port: number) {
    this.ws = new WebSocket(`ws://localhost:${port}/ws`);
    this.ws.on('message', (d) => {
      this.inbox.push(JSON.parse(String(d)));
      this.waiters.splice(0).forEach((w) => w());
    });
  }
  open() {
    return new Promise<void>((ok) => (this.ws.readyState === WebSocket.OPEN ? ok() : this.ws.once('open', () => ok())));
  }
  send(m: ClientMsg) {
    this.ws.send(JSON.stringify(m));
  }
  /** Wait for the next message of a type (consuming earlier ones). */
  async next<T extends ServerMsg['t']>(t: T): Promise<Extract<ServerMsg, { t: T }>> {
    for (;;) {
      const i = this.inbox.findIndex((m) => m.t === t);
      if (i >= 0) return this.inbox.splice(0, i + 1).pop() as Extract<ServerMsg, { t: T }>;
      await new Promise<void>((ok, fail) => {
        this.waiters.push(ok);
        setTimeout(() => fail(new Error(`timeout waiting for ${t}`)), 2000);
      });
    }
  }
  close() {
    this.ws.close();
  }
}

let dir: string;
let port: number;
let stop: () => void;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'arkham-'));
  const s = await startServer({ port: 0, dataDir: dir, staticDir: null });
  port = s.port;
  stop = () => s.server.close();
});
afterAll(() => {
  stop();
  rmSync(dir, { recursive: true, force: true });
});

describe('online rooms', () => {
  it('runs a two-player game: seats, turn permissions, broadcast, undo, chat, persistence', async () => {
    const ann = new Client(port);
    const bob = new Client(port);
    await Promise.all([ann.open(), bob.open()]);

    ann.send({ t: 'create', setup, name: 'Ann', token: 'tok-ann' });
    const created = await ann.next('sync');
    expect(created.room).toMatch(/^[A-Z0-9]{5}$/);
    expect(created.host).toBe(true);
    const room = created.room;

    bob.send({ t: 'hello', room: room.toLowerCase(), name: 'Bob', token: 'tok-bob' });
    const bobSync = await bob.next('sync');
    expect(bobSync.host).toBe(false);
    expect(bobSync.seats.map((s) => s.holder)).toEqual([null, null]);

    ann.send({ t: 'claim', seat: 0 });
    bob.send({ t: 'claim', seat: 0 });
    expect((await bob.next('error')).msg).toMatch(/taken/);
    bob.send({ t: 'claim', seat: 1 });
    await new Promise((r) => setTimeout(r, 50));
    const seats = bob.inbox.filter((m) => m.t === 'seats').pop() as Extract<ServerMsg, { t: 'seats' }>;
    expect(seats.seats.map((s) => [s.holder, s.mine])).toEqual([['Ann', false], ['Bob', true]]);

    // Mirror the game locally to know whose decision it is.
    const local = new Session(setup);
    let n = 0;
    const clients = [ann, bob];
    for (let step = 0; step < 30 && local.prompt; step++) {
      const seat = seatForPrompt(local.state, local.prompt);
      const owner = clients[seat ?? 0];
      const other = clients[seat === null ? 1 : 1 - seat];
      const a = local.prompt.multi ? [] : local.prompt.options.find((o) => !o.disabled)!.key;
      if (seat !== null) {
        other.send({ t: 'answer', n, a });
        expect((await other.next('error')).msg).toMatch(/not your decision/);
      }
      owner.send({ t: 'answer', n, a });
      const [x, y] = await Promise.all([ann.next('answer'), bob.next('answer')]);
      expect(x).toEqual({ t: 'answer', n, a });
      expect(y).toEqual(x);
      local.answer(a);
      n++;
    }
    expect(n).toBeGreaterThan(5);

    // Illegal choice and stale index.
    const p = local.prompt!;
    const seat = seatForPrompt(local.state, p) ?? 0;
    clients[seat].send({ t: 'answer', n, a: 'no-such-option' });
    expect((await clients[seat].next('error')).msg).toMatch(/not allowed/);
    clients[seat].send({ t: 'answer', n: n - 3, a: 'whatever' });
    expect((await clients[seat].next('sync')).answers).toHaveLength(n);

    // Undo: host only.
    bob.send({ t: 'undo' });
    expect((await bob.next('error')).msg).toMatch(/host/);
    ann.send({ t: 'undo' });
    expect((await bob.next('sync')).answers).toHaveLength(n - 1);

    bob.send({ t: 'chat', text: '  The Shoggoth is coming!  ' });
    expect((await ann.next('chat')).msg).toMatchObject({ from: 'Bob', text: 'The Shoggoth is coming!' });

    ann.close();
    bob.close();
    await new Promise((r) => setTimeout(r, 100));

    // Restart the server from the same data directory: the room reloads with seats intact.
    stop();
    const s2 = await startServer({ port: 0, dataDir: dir, staticDir: null });
    port = s2.port;
    stop = () => s2.server.close();
    const back = new Client(port);
    await back.open();
    back.send({ t: 'hello', room, name: 'Bob', token: 'tok-bob' });
    const resumed = await back.next('sync');
    expect(resumed.answers).toHaveLength(n - 1);
    expect(resumed.seats[1].mine).toBe(true);
    expect(resumed.chat.at(-1)?.text).toBe('The Shoggoth is coming!');
    back.close();
  });

  it('rejects unknown rooms and bad setups', async () => {
    const c = new Client(port);
    await c.open();
    c.send({ t: 'hello', room: 'ZZZZZ', name: 'X', token: 't' });
    expect((await c.next('error')).msg).toMatch(/No game/);
    c.send({ t: 'create', setup: { ...setup, investigators: [] }, name: 'X', token: 't' });
    expect((await c.next('error')).msg).toMatch(/Invalid/);
    c.send({ t: 'answer', n: 0, a: 'x' });
    expect((await c.next('error')).msg).toMatch(/Join/);
    c.close();
  });
});

describe('static files', () => {
  it('serves the app and refuses paths outside the static root', async () => {
    const root = mkdtempSync(join(tmpdir(), 'arkham-static-'));
    const { writeFileSync, mkdirSync } = await import('node:fs');
    writeFileSync(join(root, 'index.html'), '<h1>app</h1>');
    mkdirSync(`${root}-secret`, { recursive: true });
    writeFileSync(join(`${root}-secret`, 'x.txt'), 'secret');
    const s = await startServer({ port: 0, dataDir: null, staticDir: root });
    const get = (p: string) => new Promise<string>((ok) => {
      import('node:http').then(({ request }) => {
        const req = request({ port: s.port, path: p }, (res) => {
          let b = '';
          res.on('data', (c) => (b += c));
          res.on('end', () => ok(`${res.statusCode} ${b}`));
        });
        req.end();
      });
    });
    expect(await get('/')).toBe('200 <h1>app</h1>');
    expect(await get('/some/route?room=ABCDE')).toBe('200 <h1>app</h1>');
    const name = root.split('/').pop();
    expect(await get(`/../${name}-secret/x.txt`)).not.toContain('secret');
    expect(await get(`/%2e%2e/${name}-secret/x.txt`)).not.toContain('secret');
    s.server.close();
    rmSync(root, { recursive: true, force: true });
    rmSync(`${root}-secret`, { recursive: true, force: true });
  });
});
