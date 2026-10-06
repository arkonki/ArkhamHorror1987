import type { DiceShown } from '../engine';

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
};

export function Die({ value, size = 28, delay = 0 }: { value: number; size?: number; delay?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="die-roll shrink-0" style={{ animationDelay: `${delay}ms` }} aria-label={`die showing ${value}`}>
      <rect x={4} y={4} width={92} height={92} rx={18} fill="#f5f0e6" stroke="#57534e" strokeWidth={4} />
      {PIPS[value]?.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={9} fill="#1c1917" />)}
    </svg>
  );
}

/** Rolls made since the player's last decision, newest last. */
export function DiceTray({ rolls, onDismiss }: { rolls: DiceShown[]; onDismiss: () => void }) {
  if (!rolls.length) return null;
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-950/90 p-2 shadow-lg">
      <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-widest text-stone-400">
        <span>Dice since your last choice</span>
        <button onClick={onDismiss} className="rounded px-1 text-stone-400 hover:bg-stone-800 hover:text-stone-200" aria-label="Dismiss dice">✕</button>
      </div>
      <ul className="grid max-h-40 gap-1 overflow-y-auto pr-1">
        {rolls.map((r, i) => (
          <li key={r.seq ?? i} className="flex items-center gap-2 text-sm">
            <span className="flex gap-1">{r.dice.map((d, j) => <Die key={j} value={d} size={24} delay={i * 90 + j * 40} />)}</span>
            {r.target !== undefined && <span className="text-xs text-stone-400">≤ {r.target}</span>}
            <span className={`flex-1 leading-tight ${r.success === undefined ? 'text-stone-200' : r.success ? 'text-green-400' : 'text-red-400'}`}>
              {r.label}
              {r.success !== undefined && <b className="ml-1">{r.success ? '✓' : '✗'}</b>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
