// Positions on the board scan (public/assets/board.jpg, 3508x2480) for things the engine
// does not place on the street graph: Other World boxes and the doom track.
import type { WorldId } from '../engine';

const S = 3508 / 1400; // measured on a 1400px-wide overview

const WORLD_BOX2_X: Record<WorldId, number> = {
  abyss: 110, another_dimension: 273, city_of_the_great_race: 432, earths_dreamlands: 592,
  great_hall_of_celeano: 752, plateau_of_leng: 911, rlyeh: 1070, yuggoth: 1229,
};

export function worldBox(world: WorldId, box: 1 | 2): { x: number; y: number } {
  const x = WORLD_BOX2_X[world] + (box === 1 ? 45 : 0);
  return { x: x * S, y: 172 * S };
}

export function worldCard(world: WorldId): { x: number; y: number } {
  return { x: (WORLD_BOX2_X[world] + 35) * S, y: 85 * S };
}

export function doomSpace(doom: number): { x: number; y: number } {
  if (doom <= 1) return { x: 140 * S, y: 950 * S };
  if (doom >= 14) return { x: 203 * S, y: 232 * S };
  return { x: 203 * S, y: (945 - (doom - 2) * 59) * S };
}

export const DECKS = {
  spells: { x: 115 * S, y: 265 * S },
  items: { x: 115 * S, y: 445 * S },
  gates: { x: 115 * S, y: 630 * S },
};
