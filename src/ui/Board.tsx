import { useState } from 'react';
import { BOARD_H, BOARD_W, LOCATION_NODES, SPACES } from '../engine/data/boardData';
import { INVESTIGATOR_BY_ID } from '../engine/data/investigators';
import { LOCATIONS } from '../engine/data/locations';
import { MONSTER_BY_ID } from '../engine/data/monsters';
import { WORLDS } from '../engine/data/otherWorlds';
import { nodeLoc, nodePos } from '../engine/board';
import type { GameState, Investigator, MonsterInst, Prompt } from '../engine';
import { boardUrl, monsterUrl } from './assets';
import { DECKS, doomSpace, worldBox } from './layout';

interface Props {
  state: GameState;
  prompt: Prompt | null;
  onNode: (node: string) => void;
}

const COUNTER = 150;
const PAWN = 46;

function spread(i: number, n: number, r: number) {
  if (n <= 1) return { dx: 0, dy: 0 };
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  return { dx: Math.cos(a) * r, dy: Math.sin(a) * r };
}

function monsterTitle(m: MonsterInst) {
  const d = MONSTER_BY_ID[m.def];
  const move = d.speed === 0 ? 'stationary' : d.cls === 'flyer' ? `flyer F-${d.speed}` : `${d.hand}-${d.speed}`;
  const san = d.sanFailD6Plus !== undefined ? `${d.san[0]}/D6+${d.sanFailD6Plus}` : `${d.san[0]}/${d.san[1]}`;
  const sp = d.spPlusD6 ? `${d.sp}+D6` : `${d.sp + m.vampireBonus}`;
  const notes = (d.special ?? []).join(', ');
  return `${d.species}${d.cls ? ` <${d.cls}>` : ''}\nSP ${sp} · SAN ${san} · ${move}${notes ? `\n${notes}` : ''}`;
}

function heading(m: MonsterInst): number {
  if (!m.node || !m.prev) return 0;
  const a = nodePos(m.prev), b = nodePos(m.node);
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90;
}

export function Board({ state, prompt, onNode }: Props) {
  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState<string | null>(null);
  const clickable = new Set(prompt?.nodes ?? []);

  // The engine mutates state in place; derive everything on each render (no memo on `state`).
  const monstersByNode: Record<string, MonsterInst[]> = {};
  for (const m of Object.values(state.monsters)) if (m.node) (monstersByNode[m.node] ??= []).push(m);

  const invs = Object.values(state.investigators).filter((i) => !i.out);
  const invByNode: Record<string, Investigator[]> = {};
  const invByBox: Record<string, Investigator[]> = {};
  for (const i of invs) {
    if (i.place.t === 'arkham') (invByNode[i.place.node] ??= []).push(i);
    else (invByBox[`${i.place.world}:${i.place.box}`] ??= []).push(i);
  }
  const gates = Object.values(state.gates).filter((g) => g.location);
  const doom = doomSpace(state.doom);

  return (
    <div className="relative h-full w-full overflow-auto rounded-lg bg-black/40" style={{ scrollbarWidth: 'thin' }}>
      <div className="absolute right-3 top-3 z-10 flex gap-1">
        {[1, 1.5, 2].map((z) => (
          <button key={z} onClick={() => setZoom(z)} className={`rounded px-2 py-1 text-xs ${zoom === z ? 'bg-amber-200 text-stone-900' : 'bg-stone-800/80 text-stone-200'}`}>
            {z}×
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} style={{ width: `${zoom * 100}%`, display: 'block' }} role="img" aria-label="Arkham game board">
        <image href={boardUrl} width={BOARD_W} height={BOARD_H} />

        {/* Clickable street spaces and locations */}
        {Object.values(SPACES).map((s) => {
          const on = clickable.has(s.id);
          return (
            <polygon
              key={s.id}
              points={s.poly.map((p) => p.join(',')).join(' ')}
              fill={on ? (hover === s.id ? 'rgba(250,204,21,0.55)' : 'rgba(250,204,21,0.3)') : 'transparent'}
              stroke={on ? '#facc15' : 'none'}
              strokeWidth={8}
              style={{ cursor: on ? 'pointer' : 'default' }}
              onMouseEnter={() => setHover(s.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => on && onNode(s.id)}
            />
          );
        })}
        {Object.entries(LOCATION_NODES).map(([loc, p]) => {
          const id = `loc:${loc}`;
          const on = clickable.has(id);
          return (
            <g key={loc} onClick={() => on && onNode(id)} style={{ cursor: on ? 'pointer' : 'default' }} onMouseEnter={() => setHover(id)} onMouseLeave={() => setHover(null)}>
              <circle cx={p.x} cy={p.y} r={95} fill={on ? (hover === id ? 'rgba(250,204,21,0.5)' : 'rgba(250,204,21,0.25)') : 'transparent'} stroke={on ? '#facc15' : 'none'} strokeWidth={10} />
              <title>{LOCATIONS[loc as keyof typeof LOCATIONS].name}</title>
            </g>
          );
        })}

        {/* Elder Signs */}
        {state.elderSigns.map((loc) => {
          const p = LOCATION_NODES[loc];
          return (
            <text key={loc} x={p.x + 70} y={p.y - 60} fontSize={130} textAnchor="middle" fill="#fde68a" stroke="#1c1917" strokeWidth={6}>
              ⛤
            </text>
          );
        })}

        {/* Gates */}
        {gates.map((g) => {
          const p = LOCATION_NODES[g.location!];
          const w = WORLDS[g.world];
          return (
            <g key={g.uid}>
              <ellipse cx={p.x} cy={p.y} rx={110} ry={75} fill="url(#gateGlow)" stroke={g.faceUp ? w.color : '#a855f7'} strokeWidth={14} />
              <text x={p.x} y={p.y + 120} fontSize={46} textAnchor="middle" fill="#fff" stroke="#000" strokeWidth={8} paintOrder="stroke" fontWeight={700}>
                {g.faceUp ? `${w.name} · SP ${g.sp}` : 'Gate'}
              </text>
            </g>
          );
        })}
        <defs>
          <radialGradient id="gateGlow">
            <stop offset="0%" stopColor="#000" stopOpacity={0.95} />
            <stop offset="60%" stopColor="#3b0764" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#a855f7" stopOpacity={0.2} />
          </radialGradient>
        </defs>

        {/* Monsters */}
        {Object.entries(monstersByNode).map(([node, mons]) => {
          const p = nodePos(node);
          const isLoc = !!nodeLoc(node);
          return mons.map((m, i) => {
            const { dx, dy } = spread(i, mons.length, isLoc ? 130 : 70);
            const d = MONSTER_BY_ID[m.def];
            const rot = d.speed === 0 || d.cls === 'flyer' ? 0 : heading(m);
            return (
              <g key={m.uid} transform={`translate(${p.x + dx},${p.y + dy}) rotate(${rot})`}>
                <image href={monsterUrl(d.art)} x={-COUNTER / 2} y={-COUNTER / 2} width={COUNTER} height={COUNTER} style={{ filter: 'drop-shadow(0 6px 6px rgba(0,0,0,.7))' }} />
                <title>{monsterTitle(m)}</title>
              </g>
            );
          });
        })}

        {/* Investigators in Arkham */}
        {Object.entries(invByNode).map(([node, list]) => {
          const p = nodePos(node);
          return list.map((inv, i) => {
            const { dx, dy } = spread(i, list.length, 60);
            return <Pawn key={inv.id} inv={inv} x={p.x + dx} y={p.y + dy + (monstersByNode[node] ? 70 : 0)} active={state.active === inv.id} />;
          });
        })}

        {/* Investigators in Other Worlds */}
        {Object.entries(invByBox).map(([key, list]) => {
          const [world, box] = key.split(':');
          const p = worldBox(world as never, Number(box) as 1 | 2);
          return list.map((inv, i) => <Pawn key={inv.id} inv={inv} x={p.x + (i % 2) * 50 - 25} y={p.y + Math.floor(i / 2) * 50} active={state.active === inv.id} />);
        })}

        {/* Doom factor */}
        <g transform={`translate(${doom.x},${doom.y})`}>
          <circle r={70} fill="rgba(127,29,29,0.85)" stroke="#fca5a5" strokeWidth={8} />
          <text y={22} fontSize={64} textAnchor="middle" fill="#fff" fontWeight={700}>
            {state.doom}
          </text>
          <title>Doom Factor</title>
        </g>

        {/* Deck counts */}
        <DeckCount x={DECKS.spells.x} y={DECKS.spells.y} n={state.spellDeck.length} />
        <DeckCount x={DECKS.items.x} y={DECKS.items.y} n={state.itemDeck.length} />
        <DeckCount x={DECKS.gates.x} y={DECKS.gates.y} n={state.gateDeck.length} />
      </svg>
    </div>
  );
}

function DeckCount({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g transform={`translate(${x + 120},${y + 180})`}>
      <circle r={48} fill="#1c1917" stroke="#fde68a" strokeWidth={5} />
      <text y={18} fontSize={50} textAnchor="middle" fill="#fde68a">
        {n}
      </text>
    </g>
  );
}

function Pawn({ inv, x, y, active }: { inv: Investigator; x: number; y: number; active: boolean }) {
  const d = INVESTIGATOR_BY_ID[inv.defId];
  const initials = d.name.split(' ').map((w) => w[0]).join('');
  return (
    <g transform={`translate(${x},${y})`}>
      {active && <circle r={PAWN + 22} fill="none" stroke="#facc15" strokeWidth={10} className="animate-pulse" />}
      <circle r={PAWN} fill={d.pawn} stroke="#fff" strokeWidth={8} style={{ filter: 'drop-shadow(0 6px 6px rgba(0,0,0,.8))' }} />
      <text y={16} fontSize={42} textAnchor="middle" fill={d.pawn === '#e8c51c' ? '#000' : '#fff'} fontWeight={700}>
        {initials}
      </text>
      <title>{d.name}</title>
    </g>
  );
}
