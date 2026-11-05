import { useState } from 'react';
import type { Prompt, PromptKind } from '../engine';

const KEY = 'arkham.tips';

const TIPS: Partial<Record<PromptKind, { title: string; text: string }>> = {
  move: {
    title: 'Moving',
    text: 'Every space you can still reach glows. Click a nearby one to take a single step, or a faint one further away to walk the whole route at once (hover to see it). Entering a location or meeting a monster ends the move. Choose "Stop here" to stop early.',
  },
  destination: { title: 'Choosing a destination', text: 'Pick one of the glowing places on the map, or choose from the list below.' },
  orient: {
    title: 'Monster arrows',
    text: 'A new monster patrols the streets. Choose which street it heads along first; the arrow on its counter shows its direction. Hover a monster on the map to read what it does.',
  },
  combat: {
    title: 'Fighting',
    text: 'Your strongest reusable weapons are already ticked. Each choice shows what it adds against this monster, and the panel shows your chance to win. Add a spell or a one-use item if you need more (two hands at most), then Attack. A sanity roll comes first.',
  },
  cards: { title: 'Choosing cards', text: 'Click a card to pick it. Click a card in your dashboard to read it in full.' },
  choice: { title: 'Making a choice', text: 'Pick one option. The number keys 1 to 9 work too, and Enter confirms when there is only one choice. Hover places on the map to see what can happen there.' },
  ack: { title: 'Read and continue', text: 'Check what happened, then continue. The dice you rolled are shown above.' },
  newInvestigator: { title: 'A new investigator', text: 'Your investigator is gone. Pick a replacement; they join next turn.' },
};

function seen(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}

function mark(kind: string) {
  try {
    const s = seen();
    if (!s.includes(kind)) localStorage.setItem(KEY, JSON.stringify([...s, kind]));
  } catch { /* storage blocked */ }
}

/** A one-time hint the first time each kind of decision appears. */
export function Tip({ prompt }: { prompt: Prompt }) {
  const [gone, setGone] = useState<string[]>(seen);
  const tip = TIPS[prompt.kind];
  if (!tip || gone.includes(prompt.kind) || gone.includes('*')) return null;
  const dismiss = (all = false) => {
    mark(all ? '*' : prompt.kind);
    setGone([...gone, all ? '*' : prompt.kind]);
  };
  return (
    <div className="rounded-lg border border-sky-400/40 bg-sky-950/50 p-2.5 text-sm leading-snug text-sky-100" role="note">
      <div className="mb-0.5 font-bold text-sky-200">💡 {tip.title}</div>
      {tip.text}
      <div className="mt-1.5 flex gap-3 text-xs">
        <button onClick={() => dismiss()} className="rounded bg-sky-800 px-2 py-0.5 font-bold text-white hover:bg-sky-700">Got it</button>
        <button onClick={() => dismiss(true)} className="text-sky-300 underline hover:text-white">Turn off tips</button>
      </div>
    </div>
  );
}
