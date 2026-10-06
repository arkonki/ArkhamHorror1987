/**
 * Online play protocol. The server keeps the authoritative Session for each room and relays
 * answers; clients replay them with the same deterministic engine. Only answers travel — never state.
 */
import type { Answer, GameState, Prompt, Setup } from '../engine';

export interface SeatInfo {
  /** Player index in setup.players. */
  seat: number;
  name: string;
  /** Display name of whoever holds the seat (null = free). */
  holder: string | null;
  /** True when the receiving client holds it. */
  mine: boolean;
  online: boolean;
}

export interface ChatMessage {
  from: string;
  text: string;
  at: number;
}

export type ClientMsg =
  | { t: 'create'; setup: Setup; name: string; token: string }
  | { t: 'hello'; room: string; name: string; token: string }
  | { t: 'claim'; seat: number }
  | { t: 'release'; seat: number }
  | { t: 'answer'; n: number; a: Answer }
  | { t: 'undo' }
  | { t: 'chat'; text: string };

export type ServerMsg =
  | { t: 'sync'; room: string; setup: Setup; answers: Answer[]; seats: SeatInfo[]; host: boolean; chat: ChatMessage[] }
  | { t: 'answer'; n: number; a: Answer }
  | { t: 'seats'; seats: SeatInfo[] }
  | { t: 'chat'; msg: ChatMessage }
  | { t: 'error'; msg: string };

/** Which player seat must answer a prompt; null = any seated player. */
export function seatForPrompt(state: GameState, prompt: Prompt): number | null {
  if (prompt.inv) return state.investigators[prompt.inv]?.player ?? null;
  const p = prompt.data?.player;
  return typeof p === 'number' ? p : null;
}

export const ROOM_CODE = /^[A-Z0-9]{5}$/;
