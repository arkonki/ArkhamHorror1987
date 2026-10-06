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
    <section className="rounded-xl border border-stone-600 bg-stone-950 p-2.5 shadow-lg" aria-label="Dice rolls">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-stone-300">Dice rolled</h3>
        <button onClick={onDismiss} className="rounded px-2 py-0.5 text-xs text-stone-400 hover:bg-stone-800 hover:text-stone-100" aria-label="Dismiss dice">Hide ✕</button>
      </div>
      <ul className="grid max-h-60 gap-2 overflow-y-auto overflow-x-hidden pr-1">
        {rolls.map((r, i) => {
          const verdict = r.success === undefined ? null : r.success;
          const sum = r.dice.reduce((a, b) => a + b, 0);
          return (
            <li
              key={r.seq ?? i}
              className={`rounded-lg border-l-4 bg-stone-900 px-3 py-2 ${verdict === null ? 'border-stone-500' : verdict ? 'border-green-500' : 'border-red-500'}`}
            >
              <div className="flex items-center gap-3">
                <span className="flex flex-wrap gap-1.5">{r.dice.map((d, j) => <Die key={j} value={d} size={40} delay={i * 90 + j * 50} />)}</span>
                <span className="ml-auto text-right">
                  {r.dice.length > 1 && <span className="block text-xs text-stone-400">total {sum}</span>}
                  {r.target !== undefined && <span className="block text-xs text-stone-300">roll {r.target} or less</span>}
                  {verdict !== null && (
                    <span className={`mt-0.5 inline-block rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${verdict ? 'bg-green-600 text-white' : 'bg-red-700 text-white'}`}>
                      {verdict ? 'Success' : 'Failed'}
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1 text-sm leading-snug text-stone-100">{r.label}</div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
