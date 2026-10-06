import { describe, expect, it } from 'vitest';
import { Rng } from '../rng';
import { Session } from '../session';
import { DEFAULT_OPTIONS } from '../state';
import type { Answer, Prompt, Setup } from '../types';

export function makeSetup(seed: number, n = 3, gateTable: 'rules' | 'board' = 'rules'): Setup {
  const ids = ['vincent_lee', 'gloria_goldberg', 'joe_diamond', 'monterey_jack', 'jenny_barnes', 'mandy_thompson'];
  return {
    seed,
    players: [{ name: 'A' }, { name: 'B' }],
    investigators: ids.slice(0, n).map((defId, i) => ({ defId, player: i % 2, str: 3 + ((seed + i) % 5) })),
    options: {
      ...DEFAULT_OPTIONS,
      gateTable,
      orientMonsters: seed % 3 !== 0,
      rescueLost: seed % 4 === 1,
      carryLimit: seed % 5 === 2,
      fastTalkPenalty: seed % 2 === 0,
      teamFightBonus: seed % 3 === 1,
    },
  };
}

/** A random but legal player. Prefers progress (moving, fighting) so games finish. */
export function randomAnswer(p: Prompt, rng: Rng): Answer {
  const opts = p.options.filter((o) => !o.disabled);
  if (p.multi) return opts.filter(() => rng.coin()).map((o) => o.key);
  if (p.kind === 'move') {
    const moves = opts.filter((o) => o.key !== 'stop' && o.key !== 'taxi' && o.key !== 'mists');
    if (moves.length && rng.next() < 0.85) return rng.pick(moves).key;
  }
  const notWait = opts.filter((o) => o.key !== 'wait' && !o.key.startsWith('u:'));
  return rng.pick(notWait.length && rng.next() < 0.9 ? notWait : opts).key;
}

describe('random play', () => {
  for (let seed = 1; seed <= 150; seed++) {
    it(`seed ${seed} plays to completion and replays identically`, () => {
      const setup = makeSetup(seed, 1 + (seed % 5), seed % 2 ? 'rules' : 'board');
      const s = new Session(setup);
      const rng = new Rng(seed * 7919);
      let steps = 0;
      while (s.prompt && steps < 20000) {
        expect(s.answer(randomAnswer(s.prompt, rng))).toBe(true);
        steps++;
      }
      const st = s.state;
      expect(st.phase === 'over' || steps === 20000).toBe(true);
      // Invariants
      for (const inv of Object.values(st.investigators)) {
        expect(inv.str).toBeGreaterThanOrEqual(0);
        expect(inv.str).toBeLessThanOrEqual(7);
        expect(inv.san).toBeGreaterThanOrEqual(0);
        expect(inv.san).toBeLessThanOrEqual(7);
        expect(inv.money).toBeGreaterThanOrEqual(0);
      }
      const monsters = Object.values(st.monsters);
      const trophies = Object.values(st.investigators).flatMap((i) => i.trophies.monsters);
      for (const m of monsters) {
        const places = (m.node ? 1 : 0) + (st.cup.includes(m.uid) ? 1 : 0) + trophies.filter((t) => t === m.uid).length;
        expect(places, `monster ${m.uid} ${m.def}`).toBeLessThanOrEqual(1);
      }
      // Determinism: replaying the answers reproduces the same state.
      const replay = Session.load(s.save());
      expect(JSON.stringify(replay.state)).toBe(JSON.stringify(st));
    });
  }
});
