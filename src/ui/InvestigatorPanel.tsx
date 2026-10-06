import type { ReactNode } from 'react';
import { ITEM_BY_ID, LOCAL_CHARACTERS, SKILL_CARDS, SPELL_BY_ID } from '../engine/data/cards';
import { INVESTIGATOR_BY_ID } from '../engine/data/investigators';
import { MONSTER_BY_ID } from '../engine/data/monsters';
import { WORLDS } from '../engine/data/otherWorlds';
import { nodeLabel } from '../engine/board';
import { LOCATIONS } from '../engine/data/locations';
import type { GameState, Investigator } from '../engine';
import { cardUrl, investigatorUrl } from './assets';
import { itemNotes, spellNotes } from './describe';
import { WorldFacts } from './Info';
import { useZoom } from './Zoom';

export type DockMode = 'hidden' | 'compact' | 'full';

type SkillKey = 'fastTalk' | 'fight' | 'knowledge' | 'sneak';

const SKILLS: { key: SkillKey; name: string; use: string }[] = [
  { key: 'fight', name: 'Fight', use: 'Added to your D6 when attacking a monster or gate.' },
  { key: 'sneak', name: 'Sneak', use: 'Roll this or less on a D6 to slip past monsters and avoid trouble.' },
  { key: 'fastTalk', name: 'Fast Talk', use: 'Roll this or less on a D6 to bluff, bargain and talk your way out.' },
  { key: 'knowledge', name: 'Knowledge', use: 'Roll this or less on a D6 to understand books, rites and the occult.' },
];

function skill(inv: Investigator, s: SkillKey) {
  const base = INVESTIGATOR_BY_ID[inv.defId][s];
  const bonus = inv.skillCards.filter((id) => SKILL_CARDS.find((c) => c.id === id)?.skill === s).length + (s === 'fight' ? 2 * inv.localChars.length : 0);
  return { base, bonus };
}

function where(state: GameState, inv: Investigator) {
  if (inv.out) return 'Lost';
  if (inv.stranded && inv.place.t === 'world') return `Lost in ${WORLDS[inv.place.world].name}, box ${inv.place.box}. Awaiting rescue`;
  if (inv.place.t === 'world') return `${WORLDS[inv.place.world].name}, box ${inv.place.box}`;
  const label = nodeLabel(inv.place.node, (l) => LOCATIONS[l].name);
  if (inv.jailTurns) return `${label} (in jail)`;
  if (inv.activeFrom > state.turn) return `${label} (joins next turn)`;
  return label;
}

interface Props {
  state: GameState;
  mode: DockMode;
  onMode: (m: DockMode) => void;
  /** null = follow whoever's turn it is. */
  picked: string | null;
  onPick: (id: string | null) => void;
}

/** Player dashboard: a dock under the map. Compact = one-line summary, full = every detail. */
export function InvestigatorDock({ state, mode, onMode, picked, onPick }: Props) {
  const list = state.order.map((id) => state.investigators[id]).filter((i) => !i.out);
  const shownId = picked && list.some((i) => i.id === picked) ? picked : state.active;
  const inv = list.find((i) => i.id === shownId) ?? list[0];
  if (!inv) return null;
  const modeBtn = (m: DockMode, label: string) => (
    <button key={m} onClick={() => onMode(m)} aria-pressed={mode === m} className={`rounded px-2 py-0.5 text-xs ${mode === m ? 'bg-amber-200 font-bold text-stone-900' : 'text-stone-300 hover:bg-stone-800'}`}>
      {label}
    </button>
  );
  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-stone-700 bg-stone-900/90" aria-label="Investigator dashboard">
      <div className="flex items-center gap-2 border-b border-stone-800 px-2 py-1.5">
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
          {list.map((i) => {
            const def = INVESTIGATOR_BY_ID[i.defId];
            const sel = i.id === inv.id;
            return (
              <button
                key={i.id}
                onClick={() => onPick(i.id === state.active ? null : i.id)}
                aria-pressed={sel}
                className={`shrink-0 rounded-lg border px-2 py-0.5 text-left transition ${sel ? 'border-amber-300 bg-amber-950/50' : 'border-stone-700 bg-stone-900/60 hover:border-stone-500'}`}
              >
                <div className="flex items-center gap-1.5 text-sm font-bold text-stone-100">
                  <span className="h-3 w-3 rounded-full border border-white" style={{ background: def.pawn }} />
                  {def.name.split(' ')[0]}
                  {state.active === i.id && <span className="rounded bg-amber-300 px-1 text-[10px] font-bold uppercase text-stone-900">turn</span>}
                </div>
                <div className="flex gap-2 text-xs">
                  <span className={i.str <= 2 ? 'text-red-400' : 'text-red-300'}>♥ {i.str}</span>
                  <span className={i.san <= 2 ? 'text-red-400' : 'text-blue-300'}>☾ {i.san}</span>
                  <span className="text-green-300">${i.money}</span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="hidden shrink-0 items-center gap-0.5 rounded-lg bg-stone-950/70 p-0.5 lg:flex" role="group" aria-label="Dashboard size">
          {modeBtn('hidden', 'Hide')}
          {modeBtn('compact', 'Compact')}
          {modeBtn('full', 'Full')}
        </div>
      </div>
      {/* Phones always get the full stacked view; desktop follows the chosen size. */}
      <div className="min-h-0 flex-1 overflow-y-auto lg:hidden"><Full state={state} inv={inv} /></div>
      {mode !== 'hidden' && (
        <div className="hidden min-h-0 flex-1 lg:flex lg:flex-col">
          {mode === 'compact' ? <Compact state={state} inv={inv} /> : <Full state={state} inv={inv} />}
        </div>
      )}
    </section>
  );
}

function Compact({ state, inv }: { state: GameState; inv: Investigator }) {
  const zoom = useZoom();
  return (
    <div className="flex items-center gap-3 overflow-x-auto px-3 py-2 text-sm">
      <div className="shrink-0">
        <div className="font-display text-lg leading-tight text-amber-50">{inv.name}</div>
        <div className="text-xs text-stone-400">📍 {where(state, inv)}</div>
      </div>
      <Pill cls="bg-red-950 text-red-100">Strength <b>{inv.str}</b></Pill>
      <Pill cls="bg-blue-950 text-blue-100">Sanity <b>{inv.san}</b></Pill>
      <Pill cls="bg-green-950 text-green-200">${inv.money}</Pill>
      {SKILLS.map((s) => {
        const v = skill(inv, s.key);
        return <Pill key={s.key} cls="bg-stone-800 text-stone-100" title={s.use}>{s.name} <b>{v.base + v.bonus}</b></Pill>;
      })}
      <span className="h-6 w-px shrink-0 bg-stone-700" />
      {inv.items.length === 0 && inv.spells.length === 0 && <span className="shrink-0 text-xs text-stone-500">No items or spells.</span>}
      {inv.items.map((c) => {
        const it = ITEM_BY_ID[c.id];
        return (
          <button key={c.uid} onClick={() => zoom({ title: it.name, images: [cardUrl(c.id)], caption: it.text })} className="shrink-0 rounded bg-amber-950/60 px-2 py-0.5 text-xs text-amber-100 hover:bg-amber-900" title={it.text}>
            {it.name}{it.attack ? ` +${it.attack}` : ''}
          </button>
        );
      })}
      {inv.spells.map((c) => {
        const sp = SPELL_BY_ID[c.id];
        const used = inv.usedSpells.includes(c.uid);
        return (
          <button key={c.uid} onClick={() => zoom({ title: sp.name, images: [cardUrl(c.id)], caption: sp.text })} className={`shrink-0 rounded bg-purple-950/70 px-2 py-0.5 text-xs text-purple-100 hover:bg-purple-900 ${used ? 'line-through opacity-50' : ''}`} title={sp.text}>
            {sp.name}
          </button>
        );
      })}
    </div>
  );
}

function Pill({ cls, children, title }: { cls: string; children: ReactNode; title?: string }) {
  return <span title={title} className={`shrink-0 rounded-md px-2 py-1 ${cls}`}>{children}</span>;
}

function Vital({ label, value, color, low }: { label: string; value: number; color: string; low: boolean }) {
  return (
    <div className="rounded-lg bg-stone-950/60 p-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-bold uppercase text-stone-400">{label}</span>
        <span className={`text-2xl font-bold leading-none ${low ? 'text-red-400' : 'text-stone-50'}`}>{value}</span>
      </div>
      <div className="mt-1.5 flex gap-1">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="h-2.5 flex-1 rounded-sm border border-stone-600" style={{ background: i < value ? color : 'transparent' }} />
        ))}
      </div>
      {low && <div className="mt-1 text-[11px] text-red-300">Dangerously low</div>}
    </div>
  );
}

function Full({ state, inv }: { state: GameState; inv: Investigator }) {
  const zoom = useZoom();
  const d = INVESTIGATOR_BY_ID[inv.defId];
  const world = inv.place.t === 'world' ? inv.place.world : null;
  return (
    <div className={`grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[minmax(280px,340px)_1fr_1fr] ${world ? 'xl:grid-cols-[minmax(280px,340px)_1fr_1fr_minmax(280px,360px)]' : ''}`}>
      {/* Character */}
      <div className={`min-w-0 rounded-xl border p-3 ${state.active === inv.id ? 'border-amber-300/60 bg-amber-950/20' : 'border-stone-700 bg-stone-900/60'}`}>
        <div className="flex items-start gap-3">
          <button className="shrink-0 overflow-hidden rounded-lg border border-stone-600" onClick={() => zoom({ title: inv.name, images: [investigatorUrl(inv.defId)] })} aria-label={`Enlarge ${inv.name}'s sheet`} title="View full investigator sheet">
            <div role="img" aria-label={inv.name} className="h-24 w-14" style={{ backgroundImage: `url(${investigatorUrl(inv.defId)})`, backgroundSize: '303%', backgroundPosition: '72% 69%' }} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 shrink-0 rounded-full border-2 border-white" style={{ background: d.pawn }} />
              <h3 className="font-display text-xl leading-tight text-amber-50">{inv.name}</h3>
            </div>
            <div className="text-sm text-stone-400">{state.setup.players[inv.player]?.name}</div>
            <div className="mt-0.5 text-sm text-stone-200">📍 {where(state, inv)}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Vital label="Strength" value={inv.str} color="#b91c1c" low={inv.str <= 2} />
          <Vital label="Sanity" value={inv.san} color="#2563eb" low={inv.san <= 2} />
          <div className="rounded-lg bg-stone-950/60 p-2">
            <div className="text-[11px] font-bold uppercase text-stone-400">Money</div>
            <div className="text-2xl font-bold leading-tight text-green-300">${inv.money}</div>
            <div className="text-[11px] text-stone-400">{inv.retainer ? 'Retainer: +$2/turn' : ' '}</div>
          </div>
        </div>

        <SectionTitle>Skills</SectionTitle>
        <div className="grid grid-cols-4 gap-2">
          {SKILLS.map((s) => {
            const v = skill(inv, s.key);
            return (
              <div key={s.key} title={`${s.use}${v.bonus ? ` Base ${v.base} plus ${v.bonus} from cards.` : ''}`} className="rounded-lg bg-stone-950/60 px-1 py-1.5 text-center">
                <div className="text-[11px] font-bold uppercase leading-tight text-stone-400">{s.name}</div>
                <div className="text-2xl font-bold leading-tight text-stone-50">{v.base + v.bonus}</div>
                <div className={`text-[11px] ${v.bonus ? 'text-amber-300' : 'text-transparent'}`}>{v.bonus ? `${v.base} +${v.bonus}` : '.'}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          {inv.charity && <Tag text={inv.charity === 'owed' ? 'Owes Dagon: repay charity' : 'Charity available'} cls="bg-indigo-900" />}
          {inv.automobile && <Tag text="Has an automobile" cls="bg-stone-700" />}
          {inv.localChars.map((id) => <Tag key={id} text={`Ally: ${LOCAL_CHARACTERS.find((c) => c.id === id)!.name} (+2 Fight)`} cls="bg-amber-900" />)}
          {inv.skillCards.map((id, i) => <Tag key={i} text={SKILL_CARDS.find((c) => c.id === id)!.name} cls="bg-orange-800" />)}
          {inv.lostTurns > 0 && <Tag text={`Loses ${inv.lostTurns} turn${inv.lostTurns > 1 ? 's' : ''}`} cls="bg-red-900" />}
          {inv.foundGate && <Tag text="Knows both sides of a gate" cls="bg-purple-900" />}
          {inv.bound && <Tag text={`Bound ${MONSTER_BY_ID[state.monsters[inv.bound].def].species}`} cls="bg-fuchsia-900" />}
          {inv.silverKey && <Tag text={`Silver Key marks ${nodeLabel(inv.silverKey, (l) => LOCATIONS[l].name)}`} cls="bg-slate-700" />}
          {inv.stranded && <Tag text="Lost: awaiting rescue" cls="bg-red-950" />}
        </div>

        <SectionTitle>Trophies</SectionTitle>
        <div className="flex gap-4 text-sm text-stone-200">
          <span>🌀 {inv.trophies.gates.length} gate{inv.trophies.gates.length === 1 ? '' : 's'} closed</span>
          <span>☠ {inv.trophies.monsters.length} monster{inv.trophies.monsters.length === 1 ? '' : 's'}</span>
        </div>
        {inv.trophies.monsters.length > 0 && (
          <div className="mt-1 text-xs text-stone-400">{inv.trophies.monsters.map((u) => MONSTER_BY_ID[state.monsters[u].def].species).join(', ')}</div>
        )}
      </div>

      {/* Items */}
      <div className="min-w-0">
        <SectionTitle first>Items <span className="font-normal normal-case text-stone-500">({inv.items.length}) · a fight allows 2 hands' worth of weapons</span></SectionTitle>
        {inv.items.length === 0 && <Empty text="No items." />}
        <div className="grid gap-2">
          {inv.items.map((c) => {
            const it = ITEM_BY_ID[c.id];
            return (
              <button key={c.uid} onClick={() => zoom({ title: it.name, images: [cardUrl(c.id)], caption: it.text })} className="flex items-start gap-2 rounded-lg bg-stone-950/60 p-1.5 text-left hover:ring-1 hover:ring-amber-300" aria-label={`Enlarge ${it.name}`}>
                <img src={cardUrl(c.id)} alt="" className="h-16 w-24 shrink-0 rounded object-cover object-top" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-bold text-stone-50">{it.name}</span>
                    {it.attack ? <Chip cls="bg-red-900">+{it.attack} attack</Chip> : null}
                    {it.hands ? <Chip cls="bg-stone-700">{it.hands} hand{it.hands > 1 ? 's' : ''}</Chip> : null}
                    {it.magical && <Chip cls="bg-purple-900">magic</Chip>}
                    {it.oneUse && <Chip cls="bg-stone-700">one use</Chip>}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-stone-300">{it.text}</span>
                  <span className="mt-1 block text-xs leading-snug text-amber-100/80">{itemNotes(it).join(' ')}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Spells */}
      <div className="min-w-0">
        <SectionTitle first>Spells <span className="font-normal normal-case text-stone-500">({inv.spells.length})</span></SectionTitle>
        {inv.spells.length === 0 && <Empty text="No spells." />}
        <div className="grid gap-2">
          {inv.spells.map((c) => {
            const sp = SPELL_BY_ID[c.id];
            const used = inv.usedSpells.includes(c.uid);
            return (
              <button key={c.uid} onClick={() => zoom({ title: sp.name, images: [cardUrl(c.id)], caption: `${sp.text}${used ? '\n\nAlready used this turn.' : ''}` })} className={`flex items-start gap-2 rounded-lg bg-stone-950/60 p-1.5 text-left hover:ring-1 hover:ring-amber-300 ${used ? 'opacity-50' : ''}`} aria-label={`Enlarge ${sp.name}`}>
                <img src={cardUrl(c.id)} alt="" className={`h-16 w-24 shrink-0 rounded object-cover object-top ${used ? 'grayscale' : ''}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-bold text-stone-50">{sp.name}</span>
                    <Chip cls="bg-blue-900">costs {sp.sanityCost} sanity</Chip>
                    {sp.attack ? <Chip cls="bg-red-900">+{sp.attack} magic attack</Chip> : null}
                    {used && <Chip cls="bg-stone-600">used this turn</Chip>}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-stone-300">{sp.text}</span>
                  <span className="mt-1 block text-xs leading-snug text-purple-200/80">{spellNotes(sp).join(' ')}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* The Other World this investigator is in (only shown to them) */}
      {world && inv.place.t === 'world' && (
        <div className="min-w-0 rounded-xl border border-purple-500/40 bg-purple-950/30 p-3 lg:col-span-3 xl:col-span-1">
          <div className="mb-1 text-xs font-bold uppercase tracking-widest text-purple-200">You are here · box {inv.place.box}</div>
          <WorldFacts id={world} faceUp full />
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children, first }: { children: ReactNode; first?: boolean }) {
  return <h4 className={`mb-1.5 border-b border-stone-700 pb-0.5 text-xs font-bold uppercase tracking-widest text-amber-200/80 ${first ? '' : 'mt-3'}`}>{children}</h4>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-stone-700 px-2 py-1.5 text-sm text-stone-500">{text}</div>;
}

function Chip({ cls, children }: { cls: string; children: ReactNode }) {
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold text-stone-100 ${cls}`}>{children}</span>;
}

function Tag({ text, cls }: { text: string; cls: string }) {
  return <span className={`rounded px-2 py-0.5 text-stone-100 ${cls}`}>{text}</span>;
}
