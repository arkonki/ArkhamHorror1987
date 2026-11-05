import { describe, expect, it } from 'vitest';
import { ITEM_BY_ID } from '../data/cards';
import { Rng } from '../rng';
import { Session } from '../session';
import { makeSetup, randomAnswer } from './helpers';

/**
 * The combat prompt carries a planning hint (base total, per-option bonus, suggested weapons).
 * Attacking with the suggestion must be legal, fit in two hands, and the engine's real total
 * must equal base + the suggested bonuses + the die.
 */
describe('combat hint', () => {
  let verified = 0;
  for (let seed = 1; seed <= 40; seed++) {
    it(`seed ${seed}: suggested weapons are legal and the estimate matches the real total`, () => {
      const s = new Session(makeSetup(seed, 3));
      const rng = new Rng(seed * 31);
      let checked = 0;
      for (let guard = 0; s.prompt && guard < 4000; guard++) {
        const p = s.prompt;
        if (p.kind === 'combat') {
          const { base, bonus, suggest } = p.data as { base: number; bonus: Record<string, number>; suggest: string[] };
          const enabled = new Set(p.options.filter((o) => !o.disabled).map((o) => o.key));
          const inv = s.state.investigators[p.inv!];
          let hands = 0;
          for (const k of suggest) {
            expect(enabled.has(k)).toBe(true);
            const card = inv.items.find((c) => c.uid === k);
            expect(card).toBeDefined();
            const def = ITEM_BY_ID[card!.id];
            expect(def.oneUse || def.oneTurn).toBeFalsy();
            hands += def.hands ?? 0;
          }
          expect(hands).toBeLessThanOrEqual(2);

          const spectacles = inv.items.some((c) => c.id === 'alien_spectacles');
          const logBefore = s.state.log.length;
          expect(s.answer(suggest)).toBe(true);
          const line = s.state.log.slice(logBefore).find((l) => / attacks with a total of /.test(l.text));
          const roll = [...s.state.rolls].reverse().find((r) => / attack — total /.test(r.label));
          if (line && roll && !spectacles) {
            const total = Number(/total of (\d+)/.exec(line.text)![1]);
            const expected = base + suggest.reduce((n, k) => n + bonus[k], 0) + roll.dice[0];
            expect(total).toBe(expected);
            checked++;
          }
          continue;
        }
        s.answer(randomAnswer(p, rng));
      }
      verified += checked; // not every seed reaches a fight; the suite as a whole must
    });
  }
  it('verified the estimate on enough real attacks', () => {
    expect(verified).toBeGreaterThan(20);
  });
});
