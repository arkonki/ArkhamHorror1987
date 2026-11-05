import { describe, expect, it } from 'vitest';
import { Rng } from '../rng';
import { Session } from '../session';
import { makeSetup, randomAnswer } from './helpers';

/**
 * The move prompt advertises `data.reach`: every space reachable with the remaining points and the
 * steps to get there. The UI walks such a route one answer at a time, so each step must be a legal
 * answer and the walk must not end before the destination.
 */
describe('multi-space walk routes', () => {
  for (let seed = 1; seed <= 30; seed++) {
    it(`seed ${seed}: every chosen route is walkable step by step`, () => {
      const s = new Session(makeSetup(seed, 3));
      const rng = new Rng(seed * 13);
      let walked = 0;
      for (let guard = 0; s.prompt && guard < 4000; guard++) {
        const p = s.prompt;
        const reach = p.kind === 'move' ? (p.data?.reach as Record<string, string[]> | undefined) : undefined;
        const far = reach ? Object.values(reach).filter((r) => r.length > 1) : [];
        if (p.kind === 'move' && far.length && rng.next() < 0.6) {
          const route = rng.pick(far);
          const inv = p.inv;
          for (let i = 0; i < route.length; i++) {
            const cur = s.prompt!;
            expect(cur.kind).toBe('move');
            expect(cur.inv).toBe(inv);
            expect(cur.nodes).toContain(route[i]);
            expect(s.answer(route[i])).toBe(true);
          }
          const at = s.state.investigators[inv!].place;
          expect(at).toEqual({ t: 'arkham', node: route[route.length - 1] });
          walked++;
          continue;
        }
        s.answer(randomAnswer(p, rng));
      }
      expect(walked).toBeGreaterThan(0);
    });
  }
});

describe('movement odds', () => {
  it('match 2D6, a single D6 and a bonus', () => {
    const s = new Session(makeSetup(1, 1));
    const inv = Object.values(s.state.investigators)[0];
    const g = s.game;
    inv.nextMove = null;
    inv.items = inv.items.filter((c) => c.id !== 'ruby_of_rlyeh');
    const two = g.moveOdds(inv);
    expect(two.length).toBe(13);
    expect(two[2]).toBeCloseTo(1);
    expect(two[7]).toBeCloseTo(21 / 36);
    expect(two[12]).toBeCloseTo(1 / 36);
    inv.nextMove = 'd6';
    const one = g.moveOdds(inv);
    expect(one.length).toBe(7);
    expect(one[4]).toBeCloseTo(3 / 6);
    inv.nextMove = 2;
    const plus = g.moveOdds(inv);
    expect(plus.length).toBe(15);
    expect(plus[9]).toBeCloseTo(21 / 36);
  });
});
