import { existsSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_OPTIONS } from '../../src/engine/state';
import type { Setup } from '../../src/engine';
import { RoomManager, type Conn } from '../rooms';

const setup: Setup = {
  seed: 7,
  players: [{ name: 'Ann' }],
  investigators: [{ defId: 'joe_diamond', player: 0, str: 5 }],
  options: { ...DEFAULT_OPTIONS, orientMonsters: false },
};
const DAY = 86_400_000;
const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

describe('room cleanup', () => {
  it('removes idle rooms, keeps recent and connected ones, ignores other files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'arkham-sweep-'));
    dirs.push(dir);
    const rooms = new RoomManager(dir);
    const make = (token: string) => {
      const c: Conn = { token, name: token, room: null, send: () => {} };
      rooms.handle(c, { t: 'create', setup, name: token, token });
      return { c, code: c.room!.code };
    };
    const old = make('old'), recent = make('recent'), busy = make('busy');
    rooms.disconnect(old.c);
    rooms.disconnect(recent.c);

    const age = (code: string, days: number) => {
      const t = (Date.now() - days * DAY) / 1000;
      utimesSync(join(dir, `${code}.json`), t, t);
    };
    age(old.code, 30);
    age(recent.code, 2);
    age(busy.code, 30); // idle on disk but someone is still connected
    writeFileSync(join(dir, 'notes.txt'), 'keep me');

    expect(rooms.sweep(14 * DAY)).toEqual([old.code]);
    expect(existsSync(join(dir, `${old.code}.json`))).toBe(false);
    expect(existsSync(join(dir, `${recent.code}.json`))).toBe(true);
    expect(existsSync(join(dir, `${busy.code}.json`))).toBe(true);
    expect(existsSync(join(dir, 'notes.txt'))).toBe(true);
    expect(rooms.get(old.code)).toBeNull();
    expect(rooms.get(recent.code)).not.toBeNull();
  });
});
