/**
 * Room logic, independent of sockets so it can be unit-tested.
 * Each room holds the authoritative Session; answers are validated (turn order, seat ownership,
 * legality) before being applied and broadcast.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomInt } from 'node:crypto';
import { Session } from '../src/engine/session';
import type { Answer, Setup } from '../src/engine';
import { ROOM_CODE, seatForPrompt, type ChatMessage, type ClientMsg, type SeatInfo, type ServerMsg } from '../src/net/protocol';

export interface Conn {
  token: string;
  name: string;
  room: Room | null;
  send(msg: ServerMsg): void;
}

interface Saved {
  setup: Setup;
  answers: Answer[];
  /** Holder token per seat (null = free). */
  holders: (string | null)[];
  names: Record<string, string>;
  host: string;
  chat: ChatMessage[];
  updated: number;
}

export class Room {
  session: Session;
  holders: (string | null)[];
  names: Record<string, string>;
  chat: ChatMessage[];
  conns = new Set<Conn>();

  constructor(readonly code: string, setup: Setup, answers: Answer[], public host: string, saved?: Partial<Saved>) {
    this.session = new Session(setup, answers);
    this.holders = saved?.holders ?? setup.players.map(() => null);
    this.names = saved?.names ?? {};
    this.chat = saved?.chat ?? [];
  }

  seatsFor(c: Conn): SeatInfo[] {
    const online = new Set([...this.conns].map((x) => x.token));
    return this.session.setup.players.map((p, seat) => {
      const h = this.holders[seat];
      return { seat, name: p.name, holder: h ? this.names[h] ?? 'Someone' : null, mine: h === c.token, online: !!h && online.has(h) };
    });
  }

  syncFor(c: Conn): ServerMsg {
    return {
      t: 'sync', room: this.code, setup: this.session.setup, answers: [...this.session.answers],
      seats: this.seatsFor(c), host: c.token === this.host, chat: this.chat.slice(-50),
    };
  }

  broadcastSeats() {
    for (const c of this.conns) c.send({ t: 'seats', seats: this.seatsFor(c) });
  }

  toJSON(): Saved {
    return {
      setup: this.session.setup, answers: this.session.answers, holders: this.holders,
      names: this.names, host: this.host, chat: this.chat.slice(-50), updated: Date.now(),
    };
  }
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class RoomManager {
  rooms = new Map<string, Room>();

  constructor(private dataDir: string | null) {
    if (dataDir) mkdirSync(dataDir, { recursive: true });
  }

  private path(code: string) {
    return join(this.dataDir!, `${code}.json`);
  }

  save(room: Room) {
    if (this.dataDir) writeFileSync(this.path(room.code), JSON.stringify(room.toJSON()));
  }

  get(code: string): Room | null {
    if (!ROOM_CODE.test(code)) return null;
    const live = this.rooms.get(code);
    if (live) return live;
    if (!this.dataDir || !existsSync(this.path(code))) return null;
    try {
      const saved = JSON.parse(readFileSync(this.path(code), 'utf8')) as Saved;
      const room = new Room(code, saved.setup, saved.answers, saved.host, saved);
      this.rooms.set(code, room);
      return room;
    } catch {
      return null;
    }
  }

  newCode(): string {
    for (;;) {
      const code = Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
      if (!this.get(code)) return code;
    }
  }

  disconnect(c: Conn) {
    const room = c.room;
    if (!room) return;
    room.conns.delete(c);
    c.room = null;
    room.broadcastSeats();
    if (room.conns.size === 0) this.rooms.delete(room.code); // reloaded from disk on next visit
  }

  handle(c: Conn, msg: ClientMsg) {
    const err = (m: string) => c.send({ t: 'error', msg: m });
    switch (msg.t) {
      case 'create': {
        if (!validSetup(msg.setup)) return err('Invalid game setup.');
        const code = this.newCode();
        const room = new Room(code, msg.setup, [], msg.token);
        this.rooms.set(code, room);
        this.join(c, room, msg.name, msg.token);
        this.save(room);
        return;
      }
      case 'hello': {
        const room = this.get(String(msg.room).toUpperCase());
        if (!room) return err('No game with that code.');
        return this.join(c, room, msg.name, msg.token);
      }
    }
    const room = c.room;
    if (!room) return err('Join a game first.');
    switch (msg.t) {
      case 'claim': {
        if (!(msg.seat in room.holders)) return err('No such seat.');
        const h = room.holders[msg.seat];
        if (h && h !== c.token) return err('That seat is taken.');
        room.holders[msg.seat] = c.token;
        room.broadcastSeats();
        return this.save(room);
      }
      case 'release': {
        if (!(msg.seat in room.holders)) return err('No such seat.');
        if (room.holders[msg.seat] !== c.token && c.token !== room.host) return err('Only the holder or the host can free a seat.');
        room.holders[msg.seat] = null;
        room.broadcastSeats();
        return this.save(room);
      }
      case 'answer': {
        const s = room.session;
        if (msg.n !== s.answers.length) return c.send(room.syncFor(c)); // stale client: resync
        if (!s.prompt) return err('The game is over.');
        const seat = seatForPrompt(s.state, s.prompt);
        const mine = room.holders.map((h, i) => (h === c.token ? i : -1)).filter((i) => i >= 0);
        if (seat === null ? mine.length === 0 : !mine.includes(seat)) return err('It is not your decision.');
        if (!s.answer(msg.a)) return err('That choice is not allowed.');
        for (const x of room.conns) x.send({ t: 'answer', n: msg.n, a: msg.a });
        return this.save(room);
      }
      case 'undo': {
        if (c.token !== room.host) return err('Only the host can undo.');
        if (!room.session.answers.length) return;
        room.session = room.session.undo();
        for (const x of room.conns) x.send(room.syncFor(x));
        return this.save(room);
      }
      case 'chat': {
        const text = String(msg.text).trim().slice(0, 300);
        if (!text) return;
        const m: ChatMessage = { from: c.name, text, at: Date.now() };
        room.chat.push(m);
        if (room.chat.length > 200) room.chat.splice(0, room.chat.length - 200);
        for (const x of room.conns) x.send({ t: 'chat', msg: m });
        return this.save(room);
      }
    }
  }

  private join(c: Conn, room: Room, name: string, token: string) {
    if (c.room && c.room !== room) this.disconnect(c);
    c.token = String(token).slice(0, 64);
    c.name = String(name).trim().slice(0, 24) || 'Investigator';
    c.room = room;
    room.names[c.token] = c.name;
    room.conns.add(c);
    c.send(room.syncFor(c));
    room.broadcastSeats();
  }
}

function validSetup(s: Setup): boolean {
  try {
    if (!s || !Array.isArray(s.players) || !Array.isArray(s.investigators)) return false;
    if (s.players.length < 1 || s.players.length > 8 || s.investigators.length < 1 || s.investigators.length > 8) return false;
    if (s.investigators.some((i) => i.player < 0 || i.player >= s.players.length)) return false;
    const session = new Session(s);
    return !!session.prompt || session.state.phase === 'over';
  } catch {
    return false;
  }
}
