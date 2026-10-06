import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouse } from 'react';
import { BOARD_H, BOARD_W, LOCATION_NODES, SPACES } from '../engine/data/boardData';
import { INVESTIGATOR_BY_ID } from '../engine/data/investigators';
import { LOCATIONS } from '../engine/data/locations';
import { MONSTER_BY_ID } from '../engine/data/monsters';
import { WORLDS } from '../engine/data/otherWorlds';
import { NEIGHBORS, nodeLabel, nodeLoc, nodePos } from '../engine/board';
import type { GameState, Investigator, MonsterInst, Prompt } from '../engine';
import { boardUrl, monsterUrl } from './assets';
import { useZoom } from './Zoom';
import { DoomTrack, HoverCard, LocationFacts, MonsterFacts, WorldFacts } from './Info';
import { monsterText } from './describe';

interface Props {
  state: GameState;
  prompt: Prompt | null;
  onNode: (node: string) => void;
  /** Click on an investigator who is away in an Other World (selects them in the dashboard). */
  onPickInv?: (id: string) => void;
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
  return monsterText(d, m.vampireBonus);
}

function heading(m: MonsterInst): number {
  if (!m.node) return 0;
  let a, b;
  if (m.exit) {
    // Arrow points along the street the monster will take next.
    const from = nodeLoc(m.node) ? (entranceToward(m.exit, m.node) ?? m.node) : m.node;
    a = nodePos(from);
    b = nodePos(m.exit);
  } else if (m.prev) {
    a = nodePos(m.prev);
    b = nodePos(m.node);
  } else return 0;
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90;
}

/** The entrance of a location next to the street node `exit`. */
function entranceToward(exit: string, locNodeId: string): string | undefined {
  return NEIGHBORS[locNodeId]?.find((e) => NEIGHBORS[e]?.includes(exit));
}

type Tip =
  | { kind: 'loc'; id: string }
  | { kind: 'street'; id: string }
  | { kind: 'gate'; uid: string }
  | { kind: 'monster'; uid: string }
  | { kind: 'inv'; id: string };

const ZOOMS = [1, 1.35, 1.8, 2.6];
/** Only the street map is shown; the scan's doom track, decks and Other World strip are rebuilt as UI. */
const CROP = { x: 590, y: 480, w: 2790, h: 1985 };
const ASPECT = CROP.w / CROP.h;

function invPoint(inv: Investigator) {
  return inv.place.t === 'arkham' ? nodePos(inv.place.node) : null;
}

export function Board({ state, prompt, onNode, onPickInv }: Props) {
  const [zoom, setZoom] = useState(1);
  const openZoom = useZoom();
  const [hover, setHover] = useState<string | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const drag = useRef<{ x: number; y: number; sl: number; st: number; moved: boolean } | null>(null);
  const clickable = new Set(prompt?.nodes ?? []);

  const tipProps = (t: Tip) => ({
    onMouseEnter: (e: ReactMouse) => { mouse.current = { x: e.clientX, y: e.clientY }; setTip(t); },
    onMouseLeave: () => setTip((cur) => (cur && JSON.stringify(cur) === JSON.stringify(t) ? null : cur)),
  });

  // The board fits the pane (both ways on desktop); zoom steps multiply that.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const tall = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
  const fitW = size.w ? (tall && size.h ? Math.min(size.w, size.h * ASPECT) : size.w) : 0;
  const svgW = fitW * zoom;

  const centerOn = (p: { x: number; y: number }, smooth = true) => {
    const el = box.current;
    if (!el || !svgW) return;
    el.scrollTo({ left: ((p.x - CROP.x) / CROP.w) * svgW - el.clientWidth / 2, top: ((p.y - CROP.y) / CROP.h) * (svgW / ASPECT) - el.clientHeight / 2, behavior: smooth ? 'smooth' : 'auto' });
  };
  const activeInv = state.active ? state.investigators[state.active] : null;
  const activePoint = activeInv && !activeInv.out ? invPoint(activeInv) : null;
  const away = Object.values(state.investigators).filter((i) => !i.out && i.place.t === 'world');
  const activeKey = activeInv ? `${activeInv.id}:${activeInv.place.t === 'arkham' ? activeInv.place.node : activeInv.place.world}` : '';
  // Follow the active investigator whenever the board is zoomed in.
  useEffect(() => {
    if (zoom > 1 && activePoint) centerOn(activePoint);
  }, [zoom, activeKey, size.w, size.h]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDown = (e: ReactMouse) => {
    const el = box.current;
    if (!el || e.button !== 0 || zoom === 1) return;
    drag.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop, moved: false };
  };
  useEffect(() => {
    const move = (e: MouseEvent) => {
      const d = drag.current, el = box.current;
      if (!d || !el) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) < 5) return;
      d.moved = true;
      el.scrollLeft = d.sl - dx;
      el.scrollTop = d.st - dy;
    };
    const up = () => setTimeout(() => (drag.current = null), 0);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, []);

  // The engine mutates state in place; derive everything on each render (no memo on `state`).
  const monstersByNode: Record<string, MonsterInst[]> = {};
  for (const m of Object.values(state.monsters)) if (m.node) (monstersByNode[m.node] ??= []).push(m);

  const invs = Object.values(state.investigators).filter((i) => !i.out);
  const invByNode: Record<string, Investigator[]> = {};
  for (const i of invs) {
    if (i.place.t === 'arkham') (invByNode[i.place.node] ??= []).push(i);
  }
  const gates = Object.values(state.gates).filter((g) => g.location);

  return (
    <div className="relative flex w-full min-w-0 gap-1.5 lg:h-full">
      <DoomTrack doom={state.doom} spells={state.spellDeck.length} items={state.itemDeck.length} gates={state.gateDeck.length} />
      <div className="absolute left-14 top-3 z-10 flex items-center gap-1 rounded-lg bg-stone-950/80 p-1 shadow-lg backdrop-blur">
        {ZOOMS.map((z) => (
          <button key={z} onClick={() => setZoom(z)} className={`rounded px-2.5 py-1 text-sm ${zoom === z ? 'bg-amber-200 font-bold text-stone-900' : 'text-stone-200 hover:bg-stone-800'}`}>
            {z === 1 ? 'Fit' : `${z}×`}
          </button>
        ))}
        <button
          onClick={() => activePoint && (zoom === 1 ? setZoom(1.8) : centerOn(activePoint))}
          disabled={!activePoint}
          title="Center the map on the active investigator"
          className="rounded px-2.5 py-1 text-sm text-stone-200 hover:bg-stone-800 disabled:opacity-40"
        >
          ◎ Active
        </button>
      </div>
      <div
        ref={box}
        onMouseDown={onDown}
        onClickCapture={(e) => { if (drag.current?.moved) e.stopPropagation(); }}
        className="h-full min-w-0 flex-1 overflow-auto rounded-lg bg-black/40"
        style={{ scrollbarWidth: 'thin', cursor: zoom > 1 ? 'grab' : 'default' }}
      >
      <svg viewBox={`${CROP.x} ${CROP.y} ${CROP.w} ${CROP.h}`} style={{ width: svgW ? `${svgW}px` : '100%', display: 'block', maxWidth: 'none', marginInline: 'auto' }} role="img" aria-label="Arkham game board">
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
              onMouseEnter={(e) => { setHover(s.id); tipProps({ kind: 'street', id: s.id }).onMouseEnter(e); }}
              onMouseLeave={() => { setHover(null); tipProps({ kind: 'street', id: s.id }).onMouseLeave(); }}
              onClick={() => on && onNode(s.id)}
            />
          );
        })}
        {Object.entries(LOCATION_NODES).map(([loc, p]) => {
          const id = `loc:${loc}`;
          const on = clickable.has(id);
          return (
            <g key={loc} onClick={() => on && onNode(id)} style={{ cursor: on ? 'pointer' : 'default' }} onMouseEnter={(e) => { setHover(id); tipProps({ kind: 'loc', id }).onMouseEnter(e); }} onMouseLeave={() => { setHover(null); tipProps({ kind: 'loc', id }).onMouseLeave(); }}>
              <circle cx={p.x} cy={p.y} r={95} fill={on ? (hover === id ? 'rgba(250,204,21,0.5)' : 'rgba(250,204,21,0.25)') : 'transparent'} stroke={on ? '#facc15' : 'none'} strokeWidth={10} />
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
            <g key={g.uid} {...tipProps({ kind: 'gate', uid: g.uid })} onClick={() => clickable.has(`loc:${g.location}`) && onNode(`loc:${g.location}`)} style={{ cursor: clickable.has(`loc:${g.location}`) ? 'pointer' : 'help' }}>
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
              <MonsterToken
                key={m.uid}
                m={m}
                x={p.x + dx}
                y={p.y + dy}
                rot={rot}
                path={state.monsterMoves[m.uid]}
                moveSeq={state.moveSeq}
                hover={tipProps({ kind: 'monster', uid: m.uid })}
                onClick={() => (clickable.has(node) ? onNode(node) : openZoom({ title: d.species, images: [monsterUrl(d.art), monsterUrl(d.art, 'back')], caption: monsterTitle(m) }))}
              />
            );
          });
        })}

        {/* Investigators in Arkham */}
        {Object.entries(invByNode).map(([node, list]) => {
          const p = nodePos(node);
          return list.map((inv, i) => {
            const { dx, dy } = spread(i, list.length, 60);
            return <Pawn key={inv.id} hover={tipProps({ kind: 'inv', id: inv.id })} inv={inv} x={p.x + dx} y={p.y + dy + (monstersByNode[node] ? 70 : 0)} active={state.active === inv.id} />;
          });
        })}

        {/* Silver Key markers */}
        {invs.filter((i) => i.silverKey).map((i) => {
          const p = nodePos(i.silverKey!);
          return (
            <text key={`key-${i.id}`} x={p.x - 95} y={p.y - 45} fontSize={110} fill="#e5e7eb" stroke="#111" strokeWidth={6} paintOrder="stroke">
              🗝<title>{`${i.name}'s Silver Key`}</title>
            </text>
          );
        })}

      </svg>
      </div>
      {away.length > 0 && (
        <div className="absolute right-3 top-3 z-10 grid gap-1 rounded-lg bg-purple-950/85 p-2 text-sm shadow-lg backdrop-blur">
          <div className="text-[11px] font-bold uppercase tracking-widest text-purple-200">Beyond the gates</div>
          {away.map((i) => {
            const w = i.place.t === 'world' ? WORLDS[i.place.world] : null;
            return (
              <button key={i.id} onClick={() => onPickInv?.(i.id)} className="flex items-center gap-2 rounded px-1 text-left text-stone-100 hover:bg-purple-900">
                <span className="h-3 w-3 rounded-full border border-white" style={{ background: INVESTIGATOR_BY_ID[i.defId].pawn }} />
                <span className="font-bold">{i.name.split(' ')[0]}</span>
                <span style={{ color: w?.color }}>{w?.name}{i.place.t === 'world' ? ` · box ${i.place.box}` : ''}</span>
                {i.stranded && <span className="text-red-300">(lost)</span>}
              </button>
            );
          })}
        </div>
      )}
      {tip && (
        <HoverCard pos={mouse}>
          <TipBody tip={tip} state={state} />
        </HoverCard>
      )}
    </div>
  );
}

function TipBody({ tip, state }: { tip: Tip; state: GameState }) {
  const nodeMonsters = (node: string) => Object.values(state.monsters).filter((m) => m.node === node);
  const nodeInvs = (node: string) => Object.values(state.investigators).filter((i) => !i.out && i.place.t === 'arkham' && i.place.node === node);
  const here = (node: string) => {
    const ms = nodeMonsters(node), is = nodeInvs(node);
    if (!ms.length && !is.length) return null;
    return (
      <div className="mt-1 text-xs text-stone-300">
        {is.length > 0 && <div>Here now: {is.map((i) => i.name).join(', ')}</div>}
        {ms.length > 0 && <div className="text-red-300">Monsters here: {ms.map((m) => MONSTER_BY_ID[m.def].species).join(', ')}</div>}
      </div>
    );
  };
  if (tip.kind === 'loc') {
    const loc = tip.id.replace('loc:', '') as keyof typeof LOCATIONS;
    const gate = Object.values(state.gates).find((g) => g.location === loc);
    const sign = state.elderSigns.includes(loc);
    return (
      <LocationFacts
        id={loc}
        extra={
          <>
            {gate && <div className="mt-1 text-xs font-bold text-purple-300">An open gate is here{gate.faceUp ? ` to ${WORLDS[gate.world].name}` : ''}. Monsters guard it.</div>}
            {sign && <div className="mt-1 text-xs font-bold text-amber-200">⛤ Elder Sign: no gate or monster can appear here.</div>}
            {here(tip.id)}
          </>
        }
      />
    );
  }
  if (tip.kind === 'street') {
    return (
      <div>
        <div className="font-display text-lg capitalize text-amber-50">{nodeLabel(tip.id, (l) => LOCATIONS[l].name)}</div>
        <p className="mt-1 text-xs text-stone-400">Street space. No encounter happens on the street.</p>
        {SPACES[tip.id]?.taxi && <p className="mt-1 text-xs text-amber-100">Taxi stand: you can ride from here.</p>}
        {here(tip.id)}
      </div>
    );
  }
  if (tip.kind === 'gate') {
    const g = state.gates[tip.uid];
    if (!g) return null;
    return <WorldFacts id={g.world} sp={g.sp} faceUp={g.faceUp} />;
  }
  if (tip.kind === 'monster') {
    const m = state.monsters[tip.uid];
    if (!m) return null;
    return <MonsterFacts d={MONSTER_BY_ID[m.def]} vampireBonus={m.vampireBonus} />;
  }
  const inv = state.investigators[tip.id];
  if (!inv) return null;
  return (
    <div>
      <div className="font-display text-lg text-amber-50">{inv.name}</div>
      <div className="text-xs text-stone-400">{state.setup.players[inv.player]?.name}</div>
      <div className="mt-1 flex gap-3 text-sm"><span className="text-red-300">Strength {inv.str}</span><span className="text-blue-300">Sanity {inv.san}</span><span className="text-green-300">${inv.money}</span></div>
      {inv.stranded && <div className="mt-1 text-xs text-red-300">Lost in an Other World, awaiting rescue.</div>}
    </div>
  );
}

/** Remembers which Mythos movement has already been animated (per page load). */
let animatedSeq = -1;

function MonsterToken({ m, x, y, rot, path, moveSeq, onClick, hover }: { m: MonsterInst; x: number; y: number; rot: number; path?: string[]; moveSeq: number; onClick: () => void; hover: object }) {
  const ref = useRef<SVGGElement>(null);
  const d = MONSTER_BY_ID[m.def];
  useEffect(() => {
    const el = ref.current;
    if (!el || !path || path.length < 2 || moveSeq <= animatedSeq || typeof el.animate !== 'function') return;
    // Walk the counter along the streets it took, one space at a time.
    const pts = path.map((n) => nodePos(n));
    pts[pts.length - 1] = { x, y };
    const frames = pts.map((p) => ({ transform: `translate(${p.x}px, ${p.y}px) rotate(${rot}deg)` }));
    el.animate(frames, { duration: 260 * (pts.length - 1), easing: 'ease-in-out' });
    const t = setTimeout(() => (animatedSeq = Math.max(animatedSeq, moveSeq)), 0);
    return () => clearTimeout(t);
  }, [moveSeq]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <g ref={ref} transform={`translate(${x},${y}) rotate(${rot})`} style={{ cursor: 'pointer' }} onClick={onClick} {...hover}>
      <image href={monsterUrl(d.art)} x={-COUNTER / 2} y={-COUNTER / 2} width={COUNTER} height={COUNTER} style={{ filter: 'drop-shadow(0 6px 6px rgba(0,0,0,.7))' }} />
    </g>
  );
}

function Pawn({ inv, x, y, active, hover }: { inv: Investigator; x: number; y: number; active: boolean; hover: object }) {
  const d = INVESTIGATOR_BY_ID[inv.defId];
  const initials = d.name.split(' ').map((w) => w[0]).join('');
  return (
    <g transform={`translate(${x},${y})`} opacity={inv.stranded ? 0.75 : 1} {...hover}>
      {inv.stranded && <circle r={PAWN + 20} fill="rgba(127,29,29,0.35)" stroke="#f87171" strokeWidth={8} strokeDasharray="18 12" />}
      {active && <circle r={PAWN + 22} fill="none" stroke="#facc15" strokeWidth={10} className="animate-pulse" />}
      <circle r={PAWN} fill={d.pawn} stroke="#fff" strokeWidth={8} style={{ filter: 'drop-shadow(0 6px 6px rgba(0,0,0,.8))' }} />
      <text y={16} fontSize={42} textAnchor="middle" fill={d.pawn === '#e8c51c' ? '#000' : '#fff'} fontWeight={700}>
        {initials}
      </text>
    </g>
  );
}
