// Monster counters — ENG/07 counters.pdf (front = silhouette side, back = stats side).
// Movement code is taken from the silhouette side (monsters move silhouette-up); errata applied.
import type { WorldId } from './effects';

export type MonsterClass = 'power' | 'flyer' | 'blocker' | 'vampire';
export type Special =
  | 'onlyMagic'          // Only Magic Harms It
  | 'magicAndSilver'     // Werewolf: harmed by magical items, spells, silver bullet
  | 'weapons1'           // Weapons Do 1 Point Damage
  | 'tindalos'           // Attacks You in Buildings Only
  | 'nightgaunt'         // Drops You Through Nearest Gate
  | 'migo'               // Killed, Put in Monster Pile; Take 1 Item
  | 'unharmedByGuns';

export interface MonsterDef {
  /** Unique counter id; also the art file name (row/column on the counter sheet). */
  id: string;
  species: string;
  cls?: MonsterClass;
  /** 'L' | 'R' handed; null for flyers and stationary monsters. */
  hand: 'L' | 'R' | null;
  speed: number;
  /** Diamond = intersection repeater; circle = ordinary handed. */
  repeater?: boolean;
  sp: number;
  /** Shoggoth: SP 14+D6. */
  spPlusD6?: boolean;
  /** SAN pass/fail. failPlusD6: "D6+1" style loss. */
  san: [number, number];
  sanFailD6Plus?: number;
  special?: Special[];
  /** Origination class: Other World colour; null = black-and-white (unaffected by gate closing). */
  world: WorldId | null;
  art: string;
}

const m = (id: string, d: Omit<MonsterDef, 'id' | 'art'>): MonsterDef => ({ id, art: id, ...d });
const POWER = (id: string, species: string, sp: number) =>
  m(id, { species, cls: 'power', hand: null, speed: 0, sp, san: [2, 0], sanFailD6Plus: 1, special: ['onlyMagic'], world: null });

export const MONSTERS: MonsterDef[] = [
  POWER('m00', 'Cthulhu', 30),
  POWER('m01', 'Yog-Sothoth', 23),
  POWER('m02', 'Ithaqua', 24),
  POWER('m03', 'Ghatanothoa', 23),
  POWER('m04', 'Shub-Niggurath', 20),
  m('m05', { species: 'Werewolf', hand: 'L', speed: 5, sp: 8, san: [0, 1], special: ['magicAndSilver'], world: null }),
  m('m06', { species: 'Ghost', hand: null, speed: 0, sp: 6, san: [1, 2], special: ['onlyMagic'], world: null }),
  m('m10', { species: 'Ghost', hand: null, speed: 0, sp: 6, san: [1, 2], special: ['onlyMagic'], world: null }),
  m('m11', { species: 'Vampire', cls: 'vampire', hand: 'R', speed: 5, sp: 8, san: [0, 0], special: ['onlyMagic'], world: null }),
  m('m12', { species: 'Maniac', hand: 'L', speed: 5, sp: 8, san: [0, 0], world: null }),
  m('m13', { species: 'Maniac', hand: 'L', speed: 5, sp: 8, san: [0, 0], world: null }),
  m('m14', { species: 'Maniac', hand: 'R', speed: 5, sp: 8, san: [0, 0], world: null }),
  m('m15', { species: 'Maniac', hand: 'R', speed: 5, sp: 8, san: [0, 0], world: null }),
  m('m16', { species: 'Zombie', hand: 'L', speed: 5, sp: 10, san: [0, 0], special: ['onlyMagic'], world: null }),
  m('m20', { species: 'Shoggoth', hand: 'L', speed: 6, sp: 14, spPlusD6: true, san: [1, 3], special: ['weapons1'], world: 'plateau_of_leng' }),
  m('m21', { species: 'Shoggoth', hand: 'R', speed: 6, sp: 14, spPlusD6: true, san: [1, 3], special: ['weapons1'], world: 'plateau_of_leng' }),
  m('m22', { species: 'Formless Spawn', hand: 'L', speed: 5, sp: 14, san: [1, 2], special: ['onlyMagic'], world: 'abyss' }),
  m('m23', { species: 'Formless Spawn', hand: 'R', speed: 5, sp: 14, san: [1, 2], special: ['onlyMagic'], world: 'abyss' }),
  m('m24', { species: 'Ghoul', hand: 'L', speed: 6, sp: 8, san: [0, 1], world: 'abyss' }),
  m('m25', { species: 'Ghoul', hand: 'R', speed: 6, sp: 8, san: [0, 1], world: 'abyss' }),
  m('m26', { species: 'Ghoul', hand: 'R', speed: 6, sp: 8, san: [0, 1], world: 'abyss' }),
  m('m30', { species: 'Elder Thing', hand: 'L', speed: 5, sp: 12, san: [0, 1], world: 'plateau_of_leng' }),
  m('m31', { species: 'Elder Thing', hand: 'R', speed: 5, sp: 12, san: [0, 1], world: 'plateau_of_leng' }),
  m('m32', { species: 'Nightgaunt', cls: 'flyer', hand: null, speed: 6, sp: 14, san: [0, 1], special: ['nightgaunt'], world: 'earths_dreamlands' }),
  m('m33', { species: 'Nightgaunt', cls: 'flyer', hand: null, speed: 6, sp: 14, san: [0, 1], special: ['nightgaunt'], world: 'earths_dreamlands' }),
  m('m34', { species: 'Nightgaunt', cls: 'flyer', hand: null, speed: 6, sp: 14, san: [0, 1], special: ['nightgaunt'], world: 'earths_dreamlands' }),
  m('m35', { species: 'Gug', cls: 'blocker', hand: 'L', speed: 2, repeater: true, sp: 17, san: [1, 3], world: 'earths_dreamlands' }),
  m('m36', { species: 'Gug', cls: 'blocker', hand: 'R', speed: 2, repeater: true, sp: 17, san: [1, 3], world: 'earths_dreamlands' }),
  m('m40', { species: 'Byakhee', cls: 'flyer', hand: null, speed: 5, sp: 8, san: [0, 1], world: 'great_hall_of_celeano' }),
  m('m41', { species: 'Byakhee', cls: 'flyer', hand: null, speed: 5, sp: 8, san: [0, 1], world: 'great_hall_of_celeano' }),
  m('m42', { species: 'Byakhee', cls: 'flyer', hand: null, speed: 5, sp: 8, san: [0, 1], world: 'great_hall_of_celeano' }),
  // Errata: the R'lyeh star spawn turns right and moves 4.
  m('m43', { species: 'Star Spawn', cls: 'blocker', hand: 'R', speed: 4, repeater: true, sp: 18, san: [1, 3], world: 'rlyeh' }),
  m('m44', { species: 'Deep One', hand: 'L', speed: 5, sp: 9, san: [0, 1], world: 'rlyeh' }),
  m('m45', { species: 'Deep One', hand: 'L', speed: 6, sp: 9, san: [0, 1], world: 'rlyeh' }),
  m('m46', { species: 'Deep One', hand: 'R', speed: 5, sp: 9, san: [0, 1], world: 'rlyeh' }),
  m('m50', { species: 'Deep One', hand: 'R', speed: 6, sp: 9, san: [0, 1], world: 'rlyeh' }),
  m('m51', { species: 'Hound of Tindalos', cls: 'flyer', hand: null, speed: 8, sp: 15, san: [1, 4], special: ['tindalos', 'onlyMagic'], world: 'another_dimension' }),
  m('m52', { species: 'Hound of Tindalos', cls: 'flyer', hand: null, speed: 8, sp: 15, san: [1, 4], special: ['tindalos', 'onlyMagic'], world: 'another_dimension' }),
  m('m53', { species: 'Hound of Tindalos', cls: 'flyer', hand: null, speed: 8, sp: 15, san: [1, 4], special: ['tindalos', 'onlyMagic'], world: 'another_dimension' }),
  m('m54', { species: 'Dimensional Shambler', hand: 'L', speed: 3, sp: 11, san: [0, 2], world: 'another_dimension' }),
  m('m55', { species: 'Dimensional Shambler', hand: 'R', speed: 3, sp: 11, san: [0, 2], world: 'another_dimension' }),
  m('m56', { species: 'Flying Polyp', cls: 'flyer', hand: null, speed: 9, sp: 16, san: [2, 4], special: ['weapons1'], world: 'city_of_the_great_race' }),
  m('m60', { species: 'Flying Polyp', cls: 'flyer', hand: null, speed: 9, sp: 16, san: [2, 4], special: ['weapons1'], world: 'city_of_the_great_race' }),
  // Errata: lighter purple/white byakhee and star spawn belong to Celeano.
  m('m61', { species: 'Star Spawn', cls: 'blocker', hand: 'L', speed: 4, repeater: true, sp: 18, san: [1, 3], world: 'great_hall_of_celeano' }),
  // Errata: murky purple Migo and Dhole belong to Yuggoth.
  m('m62', { species: 'Migo', hand: 'L', speed: 4, sp: 9, san: [1, 2], special: ['migo'], world: 'yuggoth' }),
  m('m63', { species: 'Migo', hand: 'R', speed: 4, sp: 9, san: [1, 2], special: ['migo'], world: 'yuggoth' }),
  m('m64', { species: 'Migo', hand: 'R', speed: 4, sp: 9, san: [1, 2], special: ['migo'], world: 'yuggoth' }),
  m('m65', { species: 'Dhole', cls: 'blocker', hand: 'R', speed: 3, repeater: true, sp: 19, san: [1, 4], world: 'yuggoth' }),
  // Errata: the second purple star spawn matches no Other World; played as City of the Great Race.
  m('m66', { species: 'Star Spawn', cls: 'blocker', hand: 'L', speed: 4, repeater: true, sp: 18, san: [1, 3], world: 'city_of_the_great_race' }),
];

export const MONSTER_BY_ID: Record<string, MonsterDef> = Object.fromEntries(MONSTERS.map((d) => [d.id, d]));

/** Sanity "ghastliness" used to choose the single most ghastly monster when sneaking. */
export function ghastliness(d: MonsterDef): number {
  return d.san[1] + (d.sanFailD6Plus !== undefined ? 3.5 + d.sanFailD6Plus : 0) + d.san[0] / 10;
}
