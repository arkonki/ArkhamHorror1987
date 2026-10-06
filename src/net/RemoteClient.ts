import type { GameClient, Snapshot } from '../client';
import { Session } from '../engine';
import type { Answer, Prompt, Setup } from '../engine';
import { seatForPrompt, type ChatMessage, type ClientMsg, type SeatInfo, type ServerMsg } from './protocol';

export type ConnStatus = 'connecting' | 'online' | 'reconnecting';

const TOKEN_KEY = 'arkham1987.clientToken';
const NAME_KEY = 'arkham1987.playerName';

function storage(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return value ?? null;
  }
}

/** A stable per-browser identity: holding a seat survives reloads and reconnects. */
export function clientToken(): string {
  let t = storage(TOKEN_KEY);
  if (!t) t = storage(TOKEN_KEY, crypto.randomUUID()) ?? crypto.randomUUID();
  return t;
}

export function playerName(set?: string): string {
  if (set !== undefined) storage(NAME_KEY, set);
  return storage(NAME_KEY) ?? '';
}

export function serverUrl(): string {
  const env = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (env) return env;
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
}

/**
 * Online GameClient. Keeps a local replica Session that only advances on answers echoed by the
 * server, so all peers stay in lockstep; reconnects automatically and resyncs from the server.
 */
export class RemoteClient implements GameClient {
  session: Session | null = null;
  room: string | null;
  seats: SeatInfo[] = [];
  chat: ChatMessage[] = [];
  host = false;
  status: ConnStatus = 'connecting';
  error: string | null = null;
  private pending = false;
  private ws: WebSocket | null = null;
  private create: Setup | null;
  private listeners = new Set<() => void>();
  private version = 0;
  private snap: Snapshot | null = null;
  private retry = 0;
  private closed = false;
  private readonly token = clientToken();

  constructor(target: { create: Setup } | { room: string }, readonly name: string, private url = serverUrl()) {
    this.create = 'create' in target ? target.create : null;
    this.room = 'room' in target ? target.room.toUpperCase() : null;
    this.connect();
    if (import.meta.env.DEV) (globalThis as Record<string, unknown>).__arkham = this;
  }

  // ---------------------------------------------------------------- connection

  private connect() {
    if (this.closed) return;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      if (this.room) this.send({ t: 'hello', room: this.room, name: this.name, token: this.token });
      else if (this.create) this.send({ t: 'create', setup: this.create, name: this.name, token: this.token });
    };
    ws.onmessage = (e) => this.receive(JSON.parse(String(e.data)) as ServerMsg);
    ws.onclose = () => {
      if (this.closed) return;
      this.status = 'reconnecting';
      this.pending = false;
      this.changed();
      const delay = Math.min(10000, 500 * 2 ** this.retry++);
      setTimeout(() => this.connect(), delay);
    };
  }

  close() {
    this.closed = true;
    this.ws?.close();
  }

  private send(m: ClientMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  private receive(m: ServerMsg) {
    switch (m.t) {
      case 'sync': {
        this.room = m.room;
        this.create = null;
        this.status = 'online';
        this.error = null;
        this.seats = m.seats;
        this.host = m.host;
        this.chat = m.chat;
        this.pending = false;
        const local = this.session;
        const sameGame = local && JSON.stringify(local.setup) === JSON.stringify(m.setup)
          && local.answers.length <= m.answers.length
          && local.answers.every((a, i) => JSON.stringify(a) === JSON.stringify(m.answers[i]));
        if (sameGame) for (const a of m.answers.slice(local!.answers.length)) local!.answer(a);
        else this.session = new Session(m.setup, m.answers);
        break;
      }
      case 'answer': {
        const s = this.session;
        if (!s) return;
        this.pending = false;
        if (m.n !== s.answers.length || !s.answer(m.a)) {
          // Out of step: ask for a full resync.
          this.send({ t: 'hello', room: this.room!, name: this.name, token: this.token });
          return;
        }
        break;
      }
      case 'seats':
        this.seats = m.seats;
        break;
      case 'chat':
        this.chat = [...this.chat, m.msg].slice(-200);
        break;
      case 'error':
        this.error = m.msg;
        this.pending = false;
        break;
    }
    this.changed();
  }

  private changed() {
    this.version++;
    this.snap = this.session ? { state: this.session.state, prompt: this.session.prompt, version: this.version } : null;
    for (const fn of this.listeners) fn();
  }

  // ---------------------------------------------------------------- GameClient

  /** Null until the first sync arrives. */
  snapshot = (): Snapshot => this.snap!;

  ready(): boolean {
    return !!this.snap;
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  mySeats(): number[] {
    return this.seats.filter((s) => s.mine).map((s) => s.seat);
  }

  controls(player: number) {
    return this.mySeats().includes(player);
  }

  canAnswer(prompt: Prompt) {
    if (!this.session || this.status !== 'online' || this.pending) return false;
    const seat = seatForPrompt(this.session.state, prompt);
    return seat === null ? this.mySeats().length > 0 : this.controls(seat);
  }

  answer(a: Answer) {
    const s = this.session;
    if (!s?.prompt || !this.canAnswer(s.prompt) || !s.isValid(a)) return false;
    this.pending = true;
    this.send({ t: 'answer', n: s.answers.length, a });
    this.changed();
    return true;
  }

  canUndo() {
    return this.host && !!this.session?.answers.length && this.status === 'online';
  }

  undo() {
    this.send({ t: 'undo' });
  }

  save() {
    return this.session!.save();
  }

  claim(seat: number) {
    this.send({ t: 'claim', seat });
  }

  release(seat: number) {
    this.send({ t: 'release', seat });
  }

  say(text: string) {
    this.send({ t: 'chat', text });
  }

  clearError() {
    this.error = null;
    this.changed();
  }
}
