/** Shared test helpers: a varied game setup and a random-but-legal player. */
import { Rng } from '../rng';
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
