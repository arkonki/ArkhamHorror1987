import { useState } from 'react';
import { ITEM_BY_ID, LOCAL_CHARACTERS, SKILL_CARDS, SPELL_BY_ID } from '../engine/data/cards';
import { INVESTIGATOR_BY_ID } from '../engine/data/investigators';
import { MONSTER_BY_ID } from '../engine/data/monsters';
import { WORLDS } from '../engine/data/otherWorlds';
import { nodeLabel } from '../engine/board';
import { LOCATIONS } from '../engine/data/locations';
import type { GameState, Investigator } from '../engine';
import { cardUrl, investigatorUrl } from './assets';

function skill(inv: Investigator, s: 'fastTalk' | 'fight' | 'knowledge' | 'sneak') {
  const base = INVESTIGATOR_BY_ID[inv.defId][s];
  const bonus = inv.skillCards.filter((id) => SKILL_CARDS.find((c) => c.id === id)?.skill === s).length + (s === 'fight' ? 2 * inv.localChars.length : 0);
  return { base, bonus };
}

function where(state: GameState, inv: Investigator) {
  if (inv.out) return 'Lost';
  if (inv.place.t === 'world') return `${WORLDS[inv.place.world].name}, box ${inv.place.box}`;
  const label = nodeLabel(inv.place.node, (l) => LOCATIONS[l].name);
  if (inv.jailTurns) return `${label} (in jail)`;
  if (inv.activeFrom > state.turn) return `${label} (joins next turn)`;
  return label;
}

function Track({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="w-8 text-stone-400">{label}</span>
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} className="h-3 w-3 rounded-sm border border-stone-600" style={{ background: i < value ? color : 'transparent' }} />
      ))}
      <span className="ml-1 font-bold text-stone-100">{value}</span>
    </div>
  );
}

export function InvestigatorPanel({ state }: { state: GameState }) {
  const list = state.order.map((id) => state.investigators[id]).filter((i) => !i.out);
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      {list.map((inv) => {
        const d = INVESTIGATOR_BY_ID[inv.defId];
        const open = openId === inv.id || (openId === null && state.active === inv.id);
        return (
          <div key={inv.id} className={`rounded-lg border p-2 ${state.active === inv.id ? 'border-amber-300/70 bg-amber-950/30' : 'border-stone-700 bg-stone-900/60'}`}>
            <button className="flex w-full items-center gap-2 text-left" onClick={() => setOpenId(open ? '' : inv.id)}>
              <span className="h-4 w-4 shrink-0 rounded-full border-2 border-white" style={{ background: d.pawn }} />
              <span className="font-display text-base text-amber-50">{inv.name}</span>
              <span className="ml-auto text-xs text-stone-400">{state.setup.players[inv.player]?.name}</span>
            </button>
            <div className="mt-1 text-xs text-stone-400">{where(state, inv)}</div>
            <div className="mt-1 grid gap-0.5">
              <Track label="STR" value={inv.str} color="#b91c1c" />
              <Track label="SAN" value={inv.san} color="#2563eb" />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-stone-300">
              <span>${inv.money}</span>
              {(['fastTalk', 'fight', 'knowledge', 'sneak'] as const).map((s) => {
                const v = skill(inv, s);
                return (
                  <span key={s}>
                    {{ fastTalk: 'FT', fight: 'Fi', knowledge: 'Kn', sneak: 'Sn' }[s]} {v.base + v.bonus}
                    {v.bonus ? <span className="text-amber-300">*</span> : null}
                  </span>
                );
              })}
              <span title="Gates closed / monster trophies">🜨 {inv.trophies.gates.length} · ☠ {inv.trophies.monsters.length}</span>
            </div>
            {open && (
              <div className="mt-2 grid gap-2">
                <img src={investigatorUrl(inv.defId)} alt={inv.name} className="w-full rounded" />
                <div className="flex flex-wrap gap-1 text-[11px]">
                  {inv.charity && <Tag text={inv.charity === 'owed' ? 'Repay Charity' : 'Charity'} cls="bg-indigo-900" />}
                  {inv.retainer && <Tag text="Retainer $2" cls="bg-green-900" />}
                  {inv.automobile && <Tag text="Automobile" cls="bg-stone-700" />}
                  {inv.localChars.map((id) => <Tag key={id} text={`${LOCAL_CHARACTERS.find((c) => c.id === id)!.name} +2`} cls="bg-amber-900" />)}
                  {inv.skillCards.map((id, i) => <Tag key={i} text={SKILL_CARDS.find((c) => c.id === id)!.name} cls="bg-orange-800" />)}
                  {inv.lostTurns > 0 && <Tag text={`Loses ${inv.lostTurns} turn`} cls="bg-red-900" />}
                  {inv.foundGate && <Tag text="Knows both sides of a gate" cls="bg-purple-900" />}
                </div>
                <CardRow title="Items" ids={inv.items.map((c) => c.id)} name={(id) => ITEM_BY_ID[id].name} />
                <CardRow title="Spells" ids={inv.spells.map((c) => c.id)} name={(id) => SPELL_BY_ID[id].name} dim={inv.spells.map((c) => inv.usedSpells.includes(c.uid))} />
                {inv.trophies.monsters.length > 0 && (
                  <div className="text-xs text-stone-400">
                    Trophies: {inv.trophies.monsters.map((u) => MONSTER_BY_ID[state.monsters[u].def].species).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Tag({ text, cls }: { text: string; cls: string }) {
  return <span className={`rounded px-1.5 py-0.5 text-stone-100 ${cls}`}>{text}</span>;
}

function CardRow({ title, ids, name, dim }: { title: string; ids: string[]; name: (id: string) => string; dim?: boolean[] }) {
  if (!ids.length) return <div className="text-xs text-stone-500">No {title.toLowerCase()}.</div>;
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-wider text-stone-400">{title}</div>
      <div className="grid grid-cols-3 gap-1">
        {ids.map((id, i) => (
          <img key={i} src={cardUrl(id)} alt={name(id)} title={name(id)} className={`w-full rounded transition hover:scale-[2] hover:z-20 hover:relative ${dim?.[i] ? 'opacity-40 grayscale' : ''}`} />
        ))}
      </div>
    </div>
  );
}
