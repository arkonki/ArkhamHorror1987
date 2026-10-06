import { LOCATION_NODES, SPACES, STREET_EDGES } from './data/boardData';
import type { LocationId } from './data/effects';

/** Node ids: street spaces are `s<n>`, locations are `loc:<id>`. */
export const locNode = (id: LocationId) => `loc:${id}`;
export const isLocNode = (node: string) => node.startsWith('loc:');
export const nodeLoc = (node: string): LocationId | null => (isLocNode(node) ? (node.slice(4) as LocationId) : null);

export const STREET_NEIGHBORS: Record<string, string[]> = {};
export const NEIGHBORS: Record<string, string[]> = {};

for (const id of Object.keys(SPACES)) {
  STREET_NEIGHBORS[id] = [];
  NEIGHBORS[id] = [];
}
for (const [a, b] of STREET_EDGES) {
  STREET_NEIGHBORS[a].push(b);
  STREET_NEIGHBORS[b].push(a);
  NEIGHBORS[a].push(b);
  NEIGHBORS[b].push(a);
}
for (const [loc, def] of Object.entries(LOCATION_NODES)) {
  const n = `loc:${loc}`;
  NEIGHBORS[n] = [...def.entrances];
  for (const e of def.entrances) NEIGHBORS[e].push(n);
}

export const ALL_NODES = Object.keys(NEIGHBORS);
export const TAXI_SPACES = Object.values(SPACES).filter((s) => s.taxi).map((s) => s.id);

export function nodePos(node: string): { x: number; y: number } {
  const loc = nodeLoc(node);
  if (loc) return LOCATION_NODES[loc];
  return SPACES[node];
}

/** Compass arrow from one node toward another (screen orientation, north = up). */
export function compass(from: string, to: string): string {
  const a = nodePos(from), b = nodePos(to);
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const arrows = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
  return arrows[((Math.round(ang / 45) % 8) + 8) % 8];
}

export function isIntersection(node: string): boolean {
  return (STREET_NEIGHBORS[node]?.length ?? 0) >= 3;
}

/** Breadth-first distances over a node set. */
export function distances(from: string, passable: (n: string) => boolean = () => true, streetsOnly = false): Record<string, number> {
  const adj = streetsOnly ? STREET_NEIGHBORS : NEIGHBORS;
  const dist: Record<string, number> = { [from]: 0 };
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of adj[cur] ?? []) {
      if (dist[n] !== undefined || !passable(n)) continue;
      dist[n] = dist[cur] + 1;
      queue.push(n);
    }
  }
  return dist;
}

export function shortestPath(from: string, to: string, passable: (n: string) => boolean = () => true, streetsOnly = false): string[] | null {
  const adj = streetsOnly ? STREET_NEIGHBORS : NEIGHBORS;
  const prev: Record<string, string | null> = { [from]: null };
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === to) break;
    for (const n of adj[cur] ?? []) {
      if (n in prev || (!passable(n) && n !== to)) continue;
      prev[n] = cur;
      queue.push(n);
    }
  }
  if (!(to in prev)) return null;
  const path: string[] = [];
  for (let c: string | null = to; c !== null; c = prev[c]) path.unshift(c);
  return path;
}

/**
 * Signed turn angle from heading (prev→cur) to (cur→next), in degrees.
 * Board y grows downward, so a negative cross product is a left turn.
 */
export function turnAngle(prev: string, cur: string, next: string): number {
  const a = nodePos(prev), b = nodePos(cur), c = nodePos(next);
  const h1 = Math.atan2(b.y - a.y, b.x - a.x);
  const h2 = Math.atan2(c.y - b.y, c.x - b.x);
  let d = ((h2 - h1) * 180) / Math.PI;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d; // >0 = right turn (clockwise on screen), <0 = left turn
}

/**
 * Next street node for a handed monster moving from `prev` into `cur`.
 * On a plain street it keeps going; at intersections it takes the most left / most right branch.
 */
export function nextStreetNode(prev: string | null, cur: string, hand: 'L' | 'R', pick: (opts: string[]) => string): string {
  const opts = STREET_NEIGHBORS[cur].filter((n) => n !== prev);
  if (opts.length === 0) return prev ?? cur; // dead end: turn back
  if (opts.length === 1) return opts[0];
  if (!prev || isLocNode(prev)) return pick(opts);
  if (!isIntersection(cur)) return opts[0];
  const scored = opts.map((n) => ({ n, a: turnAngle(prev, cur, n) }));
  scored.sort((x, y) => (hand === 'R' ? y.a - x.a : x.a - y.a));
  return scored[0].n;
}

/** Spaces blocked to vehicles by blockers: the blocker's space and every adjacent street space. */
export function vehicleBlocked(blockerNodes: string[]): Set<string> {
  const out = new Set<string>();
  for (const b of blockerNodes) {
    out.add(b);
    for (const n of STREET_NEIGHBORS[b] ?? []) out.add(n);
  }
  return out;
}

/** Nearest location to each street space (for readable names like "street near the Woods"). */
export const NEAREST_LOC: Record<string, LocationId> = {};
for (const id of Object.keys(SPACES)) {
  const dist = distances(id);
  const best = Object.keys(dist).filter(isLocNode).sort((a, b) => dist[a] - dist[b])[0];
  NEAREST_LOC[id] = nodeLoc(best)!;
}

export function nodeLabel(node: string, locName: (l: LocationId) => string): string {
  const loc = nodeLoc(node);
  if (loc) return locName(loc);
  const s = SPACES[node];
  if (!s) return node;
  if (s.taxi) return `taxi stand near ${locName(NEAREST_LOC[node])}`;
  if (s.pointsTo) return `street outside ${locName(s.pointsTo)}`;
  return `street near ${locName(NEAREST_LOC[node])}`;
}
