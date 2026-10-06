import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../engine';
import { setSound, sfx, soundOn } from './sound';

/** Plays sound cues for dice, doom and gates, and collects a recap of each Mythos phase. */
export function useFeedback(state: GameState, version: number) {
  const prev = useRef({
    phase: state.phase,
    rollSeq: state.rollSeq,
    doom: state.doom,
    gates: Object.values(state.gates).filter((g) => g.location).length,
  });
  const [recap, setRecap] = useState<string[] | null>(null);

  useEffect(() => {
    const p = prev.current;
    const gates = Object.values(state.gates).filter((g) => g.location).length;
    if (p.phase === 'mythos' && state.phase !== 'mythos') {
      // The recap starts at the last "Mythos Phase" marker in the log.
      let from = 0;
      for (let i = state.log.length - 1; i >= 0; i--) if (state.log[i].text.includes('Mythos Phase')) { from = i + 1; break; }
      const lines = state.log.slice(from).filter((l) => l.kind === 'mythos' || l.kind === 'warn').map((l) => l.text);
      if (lines.length) setRecap(lines);
    }
    if (state.rollSeq > p.rollSeq) {
      sfx.dice();
      const last = state.rolls[state.rolls.length - 1];
      if (last?.success !== undefined) setTimeout(() => (last.success ? sfx.good() : sfx.bad()), 380);
    }
    if (state.doom > p.doom) sfx.doom();
    if (gates > p.gates) sfx.gate();
    prev.current = { ...p, phase: state.phase, rollSeq: state.rollSeq, doom: state.doom, gates };
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!recap) return;
    const t = setTimeout(() => setRecap(null), 20000);
    return () => clearTimeout(t);
  }, [recap]);

  return { recap, dismissRecap: () => setRecap(null) };
}

export function SoundToggle({ className }: { className: string }) {
  const [on, setOn] = useState(soundOn());
  return (
    <button
      className={className}
      aria-pressed={on}
      title={on ? 'Sound effects on' : 'Turn sound effects on'}
      onClick={() => { setSound(!on); setOn(!on); }}
    >
      {on ? '🔊' : '🔈'}
    </button>
  );
}

export function MythosRecap({ lines, onClose }: { lines: string[]; onClose: () => void }) {
  return (
    <div className="fixed left-1/2 top-14 z-30 w-[min(540px,94vw)] -translate-x-1/2 rounded-xl border border-purple-400/50 bg-purple-950/95 p-3 shadow-2xl backdrop-blur" role="status">
      <div className="mb-1 flex items-center">
        <h2 className="font-display text-xl text-purple-100">The Mythos stirs…</h2>
        <button onClick={onClose} className="ml-auto rounded px-2 text-sm text-purple-300 hover:bg-purple-900 hover:text-white" aria-label="Dismiss recap">Dismiss ✕</button>
      </div>
      <ul className="grid max-h-[40vh] gap-1 overflow-y-auto text-sm leading-snug text-purple-50">
        {lines.map((l, i) => <li key={i} className="flex gap-2"><span className="text-purple-400">▸</span>{l}</li>)}
      </ul>
    </div>
  );
}
