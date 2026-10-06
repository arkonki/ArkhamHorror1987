import { useEffect, useState } from 'react';
import { INVESTIGATOR_BY_ID } from '../engine/data/investigators';
import { MONSTER_BY_ID } from '../engine/data/monsters';
import { ITEM_BY_ID, SPELL_BY_ID } from '../engine/data/cards';
import type { Answer, GameState, Prompt } from '../engine';
import { cardUrl, investigatorUrl, monsterUrl } from './assets';
import { useZoom } from './Zoom';
import { MonsterFacts } from './Info';
import { Tip } from './Tips';

interface Props {
  state: GameState;
  prompt: Prompt;
  onAnswer: (a: Answer) => void;
}

const btn = 'rounded-lg border px-3 py-2.5 text-left text-base leading-snug transition disabled:cursor-not-allowed disabled:opacity-40';
const primary = `${btn} border-amber-300/70 bg-amber-200/15 text-amber-50 hover:bg-amber-200/30`;
const secondary = `${btn} border-stone-600 bg-stone-800/70 text-stone-100 hover:border-stone-400 hover:bg-stone-700`;

/** Numbered chip so options can also be picked from the keyboard. */
function Key({ n }: { n: number }) {
  return <span className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-stone-950/70 text-xs font-bold text-amber-200">{n}</span>;
}

function cardImage(ref?: string) {
  if (!ref) return null;
  if (ITEM_BY_ID[ref] || SPELL_BY_ID[ref]) return cardUrl(ref);
  return null;
}

export function PromptPanel({ state, prompt, onAnswer }: Props) {
  const who = prompt.inv ? state.investigators[prompt.inv] : null;
  const player = who ? state.setup.players[who.player]?.name : null;
  const [picked, setPicked] = useState<string[]>([]);
  const zoom = useZoom();
  useEffect(() => setPicked([]), [prompt]);

  // Number keys pick an option on simple choice prompts (not while typing in chat).
  const simple = !['combat', 'cards', 'newInvestigator'].includes(prompt.kind);
  useEffect(() => {
    if (!simple) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      const o = Number.isInteger(n) && n >= 1 ? prompt.options[n - 1] : undefined;
      if (o && !o.disabled) onAnswer(o.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prompt, simple, onAnswer]);

  const header = (
    <div className="mb-3">
      {who && (
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-full border-2 border-white" style={{ background: INVESTIGATOR_BY_ID[who.defId].pawn }} />
          <span className="text-sm font-bold text-amber-200">{who.name}</span>
          {player && <span className="text-sm text-stone-400">· {player}</span>}
        </div>
      )}
      <div className="mb-2 empty:hidden"><Tip prompt={prompt} /></div>
      <h2 className="font-display text-2xl leading-tight text-amber-50">{prompt.title}</h2>
      {prompt.text && <p className="mt-2 whitespace-pre-line rounded-md border-l-2 border-amber-300/40 bg-stone-950/50 px-3 py-2 text-base leading-relaxed text-stone-200">{prompt.text}</p>}
    </div>
  );

  if (prompt.kind === 'combat') {
    const sp = prompt.data?.sp as number;
    const monster = prompt.data?.monster as string | undefined;
    const hands = picked.reduce((n, k) => {
      const card = who?.items.find((c) => c.uid === k);
      return n + (card ? ITEM_BY_ID[card.id].hands ?? 0 : 0);
    }, 0);
    return (
      <div>
        {header}
        <div className="mb-3 flex items-start gap-3 rounded-lg bg-stone-950/60 p-2">
          {monster && <img src={monsterUrl(MONSTER_BY_ID[monster].art, 'back')} alt="" className="h-24 w-24 shrink-0" />}
          <div className="min-w-0 flex-1">
            {monster && <MonsterFacts d={MONSTER_BY_ID[monster]} vampireBonus={0} compact />}
            <div className="mt-2 text-sm text-stone-200">
              Beat <span className="text-lg font-bold text-amber-200">{sp}</span> with D6 + Fight + items.
              Hands used <span className={`font-bold ${hands > 2 ? 'text-red-400' : 'text-amber-200'}`}>{hands}/2</span>
            </div>
          </div>
        </div>
        <div className="grid gap-2">
          {prompt.options.map((o) => {
            const on = picked.includes(o.key);
            const img = cardImage(o.ref);
            return (
              <label key={o.key} className={`flex cursor-pointer items-center gap-2 ${secondary} ${on ? 'border-amber-300 bg-amber-900/30' : ''} ${o.disabled ? 'opacity-40' : ''}`}>
                <input type="checkbox" disabled={!!o.disabled} checked={on} onChange={() => setPicked(on ? picked.filter((k) => k !== o.key) : [...picked, o.key])} />
                {img && <img src={img} alt="" className="h-8 w-12 rounded object-cover" />}
                <span>{o.label}</span>
              </label>
            );
          })}
        </div>
        <button className={`${primary} mt-3 w-full text-center font-semibold`} disabled={hands > 2} onClick={() => onAnswer(picked)}>
          Attack! <span className="font-normal opacity-80">(Fight + {picked.length} chosen + D6)</span>
        </button>
      </div>
    );
  }

  if (prompt.kind === 'cards' && prompt.multi) {
    return (
      <div>
        {header}
        <div className="grid grid-cols-2 gap-2">
          {prompt.options.map((o) => {
            const on = picked.includes(o.key);
            const img = cardImage(o.ref);
            return (
              <button key={o.key} className={`${secondary} ${on ? 'border-amber-300 bg-amber-900/40' : ''}`} onClick={() => setPicked(on ? picked.filter((k) => k !== o.key) : [...picked, o.key])}>
                {img && <img src={img} alt="" className="mb-1 w-full rounded" />}
                {on ? '✓ ' : ''}{o.label}
              </button>
            );
          })}
        </div>
        <button className={`${primary} mt-3 w-full text-center font-semibold`} onClick={() => onAnswer(picked)}>
          {picked.length ? `Confirm (${picked.length} selected)` : 'Confirm — nothing'}
        </button>
      </div>
    );
  }

  if (prompt.kind === 'cards') {
    return (
      <div>
        {header}
        <div className="grid grid-cols-2 gap-2">
          {prompt.options.map((o) => (
            <button key={o.key} className={secondary} onClick={() => onAnswer(o.key)} disabled={!!o.disabled}>
              {cardImage(o.ref) && <img src={cardImage(o.ref)!} alt="" className="mb-1 w-full rounded" />}
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (prompt.kind === 'newInvestigator') {
    return (
      <div>
        {header}
        <div className="grid grid-cols-2 gap-2">
          {prompt.options.map((o) => (
            <button key={o.key} className={secondary} onClick={() => onAnswer(o.key)}>
              <img src={investigatorUrl(o.key)} alt="" className="mb-1 w-full rounded" />
              {INVESTIGATOR_BY_ID[o.key].name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const card = prompt.data?.card as string | undefined;
  const orientMonster = prompt.kind === 'orient' ? (prompt.data?.monster as string | undefined) : undefined;
  const isMap = prompt.kind === 'move' || prompt.kind === 'destination' || prompt.kind === 'orient';
  return (
    <div>
      {header}
      {card && (
        <button onClick={() => zoom({ title: 'Card', images: [cardUrl(card)] })} aria-label="Enlarge card">
          <img src={cardUrl(card)} alt="" className="mb-3 w-48 rounded shadow-lg" />
        </button>
      )}
      {orientMonster && (
        <div className="mb-3 flex items-start gap-3 rounded-lg bg-stone-950/60 p-2">
          <img src={monsterUrl(MONSTER_BY_ID[orientMonster].art, 'back')} alt="" className="h-20 w-20 shrink-0" />
          <div className="min-w-0 flex-1"><MonsterFacts d={MONSTER_BY_ID[orientMonster]} compact /></div>
        </div>
      )}
      {isMap && <p className="mb-2 rounded bg-amber-200/10 px-2 py-1 text-sm text-amber-100">👆 Click a glowing space on the map, or pick below.</p>}
      <div className={`grid gap-2 ${isMap && prompt.options.length > 8 ? 'max-h-72 overflow-y-auto pr-1' : ''}`}>
        {prompt.options.map((o, i) => (
          <button
            key={o.key}
            className={i === 0 && !isMap ? primary : secondary}
            disabled={!!o.disabled}
            title={o.disabled}
            onClick={() => onAnswer(o.key)}
          >
            <span className="flex items-start">
              {i < 9 && <Key n={i + 1} />}
              <span>
                {o.label}
                {o.disabled && <span className="ml-2 text-xs text-stone-400">({o.disabled})</span>}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
