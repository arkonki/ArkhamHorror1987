import { useEffect, useState } from 'react';
import { INVESTIGATOR_BY_ID } from '../engine/data/investigators';
import { MONSTER_BY_ID } from '../engine/data/monsters';
import { ITEM_BY_ID, SPELL_BY_ID } from '../engine/data/cards';
import type { Answer, GameState, Prompt } from '../engine';
import { cardUrl, investigatorUrl, monsterUrl } from './assets';
import { useZoom } from './Zoom';

interface Props {
  state: GameState;
  prompt: Prompt;
  onAnswer: (a: Answer) => void;
}

const btn = 'rounded-md border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40';
const primary = `${btn} border-amber-300/60 bg-amber-200/10 text-amber-100 hover:bg-amber-200/25`;
const secondary = `${btn} border-stone-600 bg-stone-800/60 text-stone-200 hover:bg-stone-700`;

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

  const header = (
    <div className="mb-3">
      {who && (
        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-widest text-amber-300/80">
          <span className="inline-block h-3 w-3 rounded-full border border-white" style={{ background: INVESTIGATOR_BY_ID[who.defId].pawn }} />
          {who.name}
          {player && <span className="text-stone-400">· {player}</span>}
        </div>
      )}
      <h2 className="font-display text-xl leading-tight text-amber-50">{prompt.title}</h2>
      {prompt.text && <p className="mt-2 whitespace-pre-line text-sm italic leading-relaxed text-stone-300">{prompt.text}</p>}
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
        <div className="mb-3 flex items-center gap-3">
          {monster && <img src={monsterUrl(MONSTER_BY_ID[monster].art, 'back')} alt="" className="h-32 w-32 shrink-0" />}
          <div className="text-sm text-stone-300">
            Need <span className="font-bold text-amber-200">{sp}</span>. Hands used: <span className={hands > 2 ? 'text-red-400' : ''}>{hands}/2</span>
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
          Attack! (Fight + {picked.length} chosen + D6)
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
      {orientMonster && <img src={monsterUrl(MONSTER_BY_ID[orientMonster].art, 'back')} alt="" className="mb-2 h-28 w-28" />}
      {isMap && <p className="mb-2 text-xs text-amber-200/70">Click a highlighted space on the board, or choose below.</p>}
      <div className={`grid gap-2 ${isMap && prompt.options.length > 8 ? 'max-h-72 overflow-y-auto pr-1' : ''}`}>
        {prompt.options.map((o, i) => (
          <button
            key={o.key}
            className={i === 0 && !isMap ? primary : secondary}
            disabled={!!o.disabled}
            title={o.disabled}
            onClick={() => onAnswer(o.key)}
          >
            {o.label}
            {o.disabled && <span className="ml-2 text-xs text-stone-400">({o.disabled})</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
