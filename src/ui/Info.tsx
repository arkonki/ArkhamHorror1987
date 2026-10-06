import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import type { LocationId, WorldId } from '../engine/data/effects';
import type { MonsterDef } from '../engine/data/monsters';
import { locationSummary, monsterFacts, monsterTagline, worldSummary, type Fact, type Outcome, type TableLine } from './describe';

const TONE: Record<NonNullable<Fact['tone']> | 'plain', string> = {
  bad: 'text-red-300',
  warn: 'text-amber-200',
  good: 'text-green-300',
  plain: 'text-stone-200',
};

export function MonsterFacts({ d, vampireBonus = 0, compact }: { d: MonsterDef; vampireBonus?: number; compact?: boolean }) {
  const sp = d.spPlusD6 ? `${d.sp}+D6` : `${d.sp + vampireBonus}`;
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-lg text-amber-50">{d.species}</span>
        <span className="text-xs uppercase tracking-wider text-stone-400">{monsterTagline(d)}</span>
      </div>
      <div className="mt-1 flex gap-2 text-center text-xs">
        <Stat label="Strength" value={sp} cls="bg-red-950 text-red-100" />
        <Stat label="Sanity loss" value={d.sanFailD6Plus !== undefined ? `${d.san[0]} / D6+${d.sanFailD6Plus}` : d.san[0] === 0 && d.san[1] === 0 ? 'none' : `${d.san[0]} / ${d.san[1]}`} cls="bg-blue-950 text-blue-100" />
        <Stat label="Speed" value={d.speed === 0 ? '–' : `${d.speed}`} cls="bg-stone-800 text-stone-100" />
      </div>
      <ul className={`mt-2 grid gap-1 ${compact ? 'text-xs' : 'text-sm'} leading-snug`}>
        {monsterFacts(d, vampireBonus).filter((f) => !compact || f.label !== 'Origin').map((f, i) => (
          <li key={i} className={TONE[f.tone ?? 'plain']}>
            <b className="mr-1 text-stone-400">{f.label}:</b>
            {f.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className={`flex-1 rounded px-2 py-1 ${cls}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-base font-bold leading-tight">{value}</div>
    </div>
  );
}

const DOT: Record<Outcome, string> = { danger: 'bg-red-500', boon: 'bg-green-500', mixed: 'bg-amber-400', neutral: 'bg-stone-500' };
const DOT_NAME: Record<Outcome, string> = { danger: 'risky', boon: 'rewarding', mixed: 'gamble', neutral: 'neutral' };

function Lines({ lines }: { lines: TableLine[] }) {
  return (
    <ol className="grid gap-1 text-xs leading-snug">
      {lines.map((l, i) => (
        <li key={i} className="flex gap-2">
          <span className="w-6 shrink-0 text-right font-bold text-stone-300">{l.roll}</span>
          <span title={DOT_NAME[l.outcome]} className={`mt-1 h-2 w-2 shrink-0 rounded-full ${DOT[l.outcome]}`} />
          <span className="text-stone-200">{l.text}</span>
        </li>
      ))}
    </ol>
  );
}

function Odds({ odds }: { odds: { danger: number; boon: number } | null }) {
  if (!odds) return null;
  return (
    <div className="mt-1 flex gap-3 text-xs">
      <span className="text-green-300">Rewards {odds.boon}/6</span>
      <span className="text-red-300">Trouble {odds.danger}/6</span>
    </div>
  );
}

export function LocationFacts({ id, extra }: { id: LocationId; extra?: ReactNode }) {
  const s = locationSummary(id);
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-lg text-amber-50">{s.name}</span>
        <span className="text-xs uppercase tracking-wider text-stone-400">{s.kind}</span>
      </div>
      {extra}
      <p className="mt-1 text-xs text-stone-400">
        {s.lines.length ? 'End your move here and roll a D6 for the encounter:' : 'No encounter table: this place only offers its services.'}
      </p>
      {s.services.map((t, i) => <p key={i} className="mt-1 text-xs text-amber-100">{t}</p>)}
      {s.lines.length > 0 && <div className="mt-2"><Lines lines={s.lines} /></div>}
      <Odds odds={s.odds} />
      {s.buysItems && <p className="mt-1 text-xs text-stone-300">Buys items worth more than $1 at half price.</p>}
    </div>
  );
}

export function WorldFacts({ id, sp, faceUp, full }: { id: WorldId; sp?: number; faceUp: boolean; full?: boolean }) {
  const w = worldSummary(id, full);
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-lg" style={{ color: w.color }}>{faceUp ? w.name : 'Unexplored gate'}</span>
        <span className="text-xs uppercase tracking-wider text-stone-400">Open gate{sp !== undefined && faceUp ? ` · closing strength ${sp}` : ''}</span>
      </div>
      {faceUp ? (
        <>
          <p className="mt-1 text-xs text-stone-400">Enter the gate and roll a D6 each turn in this world:</p>
          <div className="mt-2"><Lines lines={w.lines} /></div>
          <Odds odds={w.odds} />
        </>
      ) : (
        <p className="mt-1 text-xs text-stone-300">Nobody has looked through this gate yet. Enter it to find out which Other World lies beyond.</p>
      )}
    </div>
  );
}

/** A floating card that follows the pointer. Position is written straight to the DOM (no re-render on move). */
export function HoverCard({ pos, children }: { pos: RefObject<{ x: number; y: number }>; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const place = () => {
      const { x, y } = pos.current;
      const w = el.offsetWidth, h = el.offsetHeight;
      const left = x + 18 + w > window.innerWidth ? Math.max(8, x - 18 - w) : x + 18;
      const top = Math.min(Math.max(8, y - 12), Math.max(8, window.innerHeight - h - 8));
      el.style.transform = `translate(${left}px, ${top}px)`;
      el.style.visibility = 'visible';
    };
    const move = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      place();
    };
    place();
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  });
  return (
    <div ref={ref} className="pointer-events-none fixed left-0 top-0 z-50 w-[22rem] max-w-[92vw] rounded-lg border border-amber-200/30 bg-stone-950/95 p-3 shadow-2xl backdrop-blur" style={{ visibility: 'hidden' }}>
      {children}
    </div>
  );
}

/** Slim vertical doom track plus deck counts, standing at the screen's left edge. */
export function DoomTrack({ doom, spells, items, gates }: { doom: number; spells: number; items: number; gates: number }) {
  const cells = Array.from({ length: 13 }, (_, i) => 13 - i);
  return (
    <div className="flex w-11 shrink-0 flex-col items-center gap-1 rounded-lg bg-stone-950/80 py-1.5" aria-label={`Doom track: ${doom} of 13`}>
      <div className="text-[9px] font-bold uppercase leading-none tracking-wider text-red-300">Doom</div>
      <div className="flex min-h-0 flex-1 flex-col gap-px">
        {cells.map((n) => {
          const here = n === doom;
          const filled = n < doom;
          const hot = n >= 10;
          return (
            <div
              key={n}
              title={n === 13 ? 'Doom 13: the Ancient One awakens' : `Doom ${n}`}
              className={`flex w-8 flex-1 items-center justify-center rounded-sm text-[11px] font-bold leading-none ${
                here ? 'bg-red-600 text-white ring-2 ring-red-200' : filled ? 'bg-red-950 text-red-400' : hot ? 'bg-stone-800 text-red-300' : 'bg-stone-800 text-stone-400'
              }`}
              style={{ minHeight: 14 }}
            >
              {n}
            </div>
          );
        })}
      </div>
      <div className="mt-1 grid gap-1 text-center text-[10px] leading-tight text-stone-300">
        <span title="Spell cards left in the deck"><b className="block text-sm text-purple-200">{spells}</b>spells</span>
        <span title="Item cards left in the deck"><b className="block text-sm text-amber-200">{items}</b>items</span>
        <span title="Gate cards left in the deck"><b className="block text-sm text-blue-200">{gates}</b>gates</span>
      </div>
    </div>
  );
}
