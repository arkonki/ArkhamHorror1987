// Plain-language descriptions of monsters, locations and Other Worlds for tooltips and cards.
import type { MonsterDef, Special } from '../engine/data/monsters';
import { LOCATIONS } from '../engine/data/locations';
import { WORLDS } from '../engine/data/otherWorlds';
import type { LocationId, TableEntry, WorldId } from '../engine/data/effects';

export interface Fact {
  label: string;
  text: string;
  tone?: 'bad' | 'good' | 'warn';
}

const SPECIALS: Record<Special, string> = {
  onlyMagic: 'Only magic hurts it: magical weapons and spells count, ordinary weapons add nothing.',
  magicAndSilver: 'Only magical items, spells and the Silver Bullet hurt it.',
  weapons1: 'Weapons are weak against it: each one adds only 1.',
  tindalos: 'Attacks you only when you are inside a building.',
  nightgaunt: 'If it wins, it carries you off through the nearest open gate.',
  migo: 'When killed it goes to the monster pile and you take 1 item.',
  unharmedByGuns: 'Guns are useless against it.',
};

export function movementText(d: MonsterDef): string {
  if (d.speed === 0) return 'Stationary: never moves, but you meet it if you enter its space.';
  if (d.cls === 'flyer') return `Flies up to ${d.speed} spaces each Mythos phase along the streets, straight toward the nearest investigator.`;
  const turn = d.hand === 'L' ? 'left' : 'right';
  return `Walks up to ${d.speed} spaces each Mythos phase and stops when it meets an investigator. Turns ${turn} at intersections.`;
}

export function horrorText(d: MonsterDef): { text: string; tone?: Fact['tone'] } {
  const [pass, fail] = d.san;
  if (d.sanFailD6Plus !== undefined) return { text: `Sanity roll: pass and lose ${pass}; fail and lose D6+${d.sanFailD6Plus}.`, tone: 'bad' };
  if (pass === 0 && fail === 0) return { text: 'Not mind-threatening: no sanity roll.' };
  return { text: `Sanity roll: pass and lose ${pass}; fail and lose ${fail}.`, tone: fail >= 3 ? 'bad' : 'warn' };
}

export function monsterFacts(d: MonsterDef, vampireBonus = 0): Fact[] {
  const facts: Fact[] = [];
  const need = d.spPlusD6 ? `${d.sp} plus a D6 rolled when it appears` : `${d.sp + vampireBonus}`;
  facts.push({ label: 'To defeat', text: `Your total (D6 + Fight + weapons) must reach ${need}.` });
  const h = horrorText(d);
  facts.push({ label: 'Horror', text: h.text, tone: h.tone });
  facts.push({ label: 'Movement', text: movementText(d) });
  if (d.cls === 'blocker') facts.push({ label: 'Blocker', text: 'Stops vehicles one space away; on foot you may enter its space but must stop there.', tone: 'warn' });
  if (d.cls === 'vampire') facts.push({ label: 'Grows', text: `Gains +1 strength each time a gate opens${vampireBonus ? ` (now +${vampireBonus})` : ''}.`, tone: 'warn' });
  for (const s of d.special ?? []) facts.push({ label: 'Special', text: SPECIALS[s], tone: 'warn' });
  facts.push({
    label: 'Origin',
    text: d.world ? `Returns to the monster cup when the gate to ${WORLDS[d.world].name} closes.` : 'Native to Arkham: closing gates does not remove it.',
  });
  return facts;
}

export function monsterTagline(d: MonsterDef): string {
  const cls = d.cls === 'power' ? 'Great Old One' : d.cls === 'flyer' ? 'Flyer' : d.cls === 'blocker' ? 'Blocker' : d.cls === 'vampire' ? 'Vampire' : 'Walker';
  return `${cls} · ${d.speed === 0 ? 'stationary' : `speed ${d.speed}`}`;
}

/** Plain-text version for captions. */
export function monsterText(d: MonsterDef, vampireBonus = 0): string {
  return monsterFacts(d, vampireBonus).map((f) => `${f.label}: ${f.text}`).join('\n');
}

// ---- Locations and Other Worlds -------------------------------------------------------------

export type Outcome = 'danger' | 'boon' | 'mixed' | 'neutral';

function has(fx: unknown, ...kinds: string[]): boolean {
  const s = JSON.stringify(fx);
  return kinds.some((k) => s.includes(`"k":"${k}"`));
}

/** Rough read of an entry: does it help, hurt, or ask you to gamble? */
export function outcomeOf(e: TableEntry): Outcome {
  const bad = has(e.fx, 'monster', 'gateAndMonster', 'jail', 'stay', 'lost', 'lose', 'loseAllMoney', 'sidewalk', 'visitWorld');
  const good = has(e.fx, 'gain', 'draw', 'localCharacter', 'retainer', 'ride', 'tempSkill');
  if (bad && good) return 'mixed';
  if (bad) return 'danger';
  if (good) return 'boon';
  return 'neutral';
}

const rollLabel = (r: number[]) => (r.length === 1 ? `${r[0]}` : `${r[0]}-${r[r.length - 1]}`);

export interface TableLine { roll: string; text: string; outcome: Outcome; danger: boolean }

function gist(text: string, max = 118): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

export function tableLines(table: TableEntry[]): TableLine[] {
  return table.map((e) => ({ roll: rollLabel(e.roll), text: gist(e.text), outcome: outcomeOf(e), danger: has(e.fx, 'monster', 'gateAndMonster') }));
}

/** Sixths of the table that are dangerous / rewarding. */
export function oddsOf(table: TableEntry[]): { danger: number; boon: number } {
  let danger = 0, boon = 0;
  for (const e of table) {
    const n = e.roll.length, o = outcomeOf(e);
    if (o === 'danger') danger += n;
    else if (o === 'boon') boon += n;
  }
  return { danger, boon };
}

export interface LocationSummary {
  name: string;
  kind: string;
  services: string[];
  lines: TableLine[];
  odds: { danger: number; boon: number } | null;
  buysItems: boolean;
}

export function locationSummary(id: LocationId): LocationSummary {
  const l = LOCATIONS[id];
  return {
    name: l.name,
    kind: l.building ? 'Building' : 'Outdoors',
    services: (l.services ?? []).map((s) => gist(s.text, 170)),
    lines: l.table ? tableLines(l.table) : [],
    odds: l.table ? oddsOf(l.table) : null,
    buysItems: !!l.buysItems,
  };
}

export function worldSummary(id: WorldId) {
  const w = WORLDS[id];
  return { name: w.name, color: w.color, lines: tableLines(w.table), odds: oddsOf(w.table) };
}
