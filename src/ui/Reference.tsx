import { useEffect, useState, type ReactNode } from 'react';
import rulesText from '../../docs/RULES_NOTES.md?raw';
import { GATES, ITEMS, SPELLS } from '../engine/data/cards';
import { GATE_APPEARANCE, LOCATIONS } from '../engine/data/locations';
import { MONSTERS, type MonsterDef } from '../engine/data/monsters';
import { WORLDS } from '../engine/data/otherWorlds';
import type { TableEntry } from '../engine/data/effects';
import { cardUrl, monsterUrl } from './assets';
import { useZoom } from './Zoom';

type Tab = 'rules' | 'locations' | 'worlds' | 'monsters' | 'cards';

/** Tiny markdown renderer for the rules digest: headings, bullets (with wrapped lines), bold, code. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
    part.startsWith('**') ? <b key={i} className="text-amber-100">{part.slice(2, -2)}</b>
      : part.startsWith('`') ? <code key={i} className="rounded bg-stone-800 px-1">{part.slice(1, -1)}</code>
      : part,
  );
}

function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={blocks.length} className="mb-3 list-disc space-y-1 pl-5">{list.map((li, i) => <li key={i}>{inline(li)}</li>)}</ul>);
    if (para.length) blocks.push(<p key={blocks.length} className="mb-3">{inline(para.join(' '))}</p>);
    list = [];
    para = [];
  };
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    const h = /^(#{1,3}) (.*)/.exec(line);
    if (h) {
      flush();
      const cls = h[1].length === 1 ? 'mt-6 text-2xl' : h[1].length === 2 ? 'mt-5 text-xl' : 'mt-4 text-lg';
      blocks.push(<h3 key={blocks.length} className={`mb-2 font-display text-amber-100 ${cls}`}>{h[2]}</h3>);
    } else if (/^\s*[-\d]+[.)]? /.test(line) && /^\s*(- |\d+\. )/.test(line)) {
      if (para.length) flush();
      list.push(line.replace(/^\s*(- |\d+\. )/, ''));
    } else if (/^\s{2,}\S/.test(line) && list.length) {
      list[list.length - 1] += ' ' + line.trim();
    } else if (!line.trim()) flush();
    else para.push(line.trim());
  }
  flush();
  return <div className="text-sm leading-relaxed text-stone-300">{blocks}</div>;
}

function Table({ name, rows, note }: { name: string; rows: TableEntry[]; note?: ReactNode }) {
  return (
    <section className="mb-4 rounded-lg border border-stone-700 bg-stone-900/60 p-3">
      <h3 className="font-display text-lg text-amber-100">{name}</h3>
      {note}
      <ol className="mt-1 space-y-1 text-sm text-stone-300">
        {rows.map((r) => (
          <li key={r.roll.join()} className="flex gap-2">
            <span className="w-8 shrink-0 font-bold text-amber-200">{r.roll.length > 1 ? `${r.roll[0]}–${r.roll[r.roll.length - 1]}` : r.roll[0]}</span>
            <span>{r.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function monsterSummary(d: MonsterDef) {
  const move = d.speed === 0 ? 'stationary' : d.cls === 'flyer' ? `F-${d.speed}` : `${d.hand}-${d.speed}`;
  const san = d.sanFailD6Plus !== undefined ? `${d.san[0]}/D6+${d.sanFailD6Plus}` : `${d.san[0]}/${d.san[1]}`;
  return `${move} · SP ${d.spPlusD6 ? `${d.sp}+D6` : d.sp} · SAN ${san}`;
}

export function Reference({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('rules');
  const zoom = useZoom();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // The zoom viewer (if open) handles Escape first.
      if (e.key === 'Escape' && document.querySelectorAll('[role=dialog]').length === 1) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const tabs: [Tab, string][] = [['rules', 'Rules'], ['locations', 'Locations'], ['worlds', 'Other Worlds'], ['monsters', 'Monsters'], ['cards', 'Cards']];
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60" onClick={onClose}>
      <div className="flex h-full w-full max-w-3xl flex-col border-l border-amber-200/20 bg-stone-950 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Rules reference">
        <div className="flex flex-wrap items-center gap-1 border-b border-stone-800 p-3">
          {tabs.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded px-3 py-1 text-sm ${tab === k ? 'bg-amber-200 text-stone-900' : 'text-stone-300 hover:bg-stone-800'}`}>{label}</button>
          ))}
          <button onClick={onClose} className="ml-auto rounded border border-stone-600 px-2 py-1 text-sm text-stone-300 hover:bg-stone-800">Close</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'rules' && <Markdown text={rulesText} />}
          {tab === 'locations' && (
            <>
              <section className="mb-4 rounded-lg border border-stone-700 bg-stone-900/60 p-3 text-sm text-stone-300">
                <h3 className="font-display text-lg text-amber-100">Gate Appearance Table (2D6)</h3>
                {Object.entries(GATE_APPEARANCE).map(([n, l]) => <div key={n}><b className="text-amber-200">{n}</b> — {LOCATIONS[l].name}</div>)}
                <p className="mt-1 text-xs text-stone-400">Extra monster on every gated location: 7 (rules sheet) or 4 and 10 (game board) — chosen at setup.</p>
              </section>
              {Object.values(LOCATIONS).sort((a, b) => a.name.localeCompare(b.name)).map((l) => (
                l.table ? <Table key={l.id} name={l.name} rows={l.table} note={l.services?.map((s) => <p key={s.id} className="text-xs italic text-stone-400">{s.text}</p>)} />
                  : (
                    <section key={l.id} className="mb-4 rounded-lg border border-stone-700 bg-stone-900/60 p-3">
                      <h3 className="font-display text-lg text-amber-100">{l.name}</h3>
                      {l.services?.map((s) => <p key={s.id} className="text-sm text-stone-300">{s.text}</p>)}
                    </section>
                  )
              ))}
            </>
          )}
          {tab === 'worlds' && Object.values(WORLDS).map((w) => (
            <Table key={w.id} name={w.name} rows={w.table} note={<p className="text-xs text-stone-400">Gate SP {GATES.find((g) => g.world === w.id)?.sp} · monsters of this colour fade when its gate closes<span className="ml-2 inline-block h-3 w-3 rounded-sm align-middle" style={{ background: w.color }} /></p>} />
          ))}
          {tab === 'monsters' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {MONSTERS.map((d) => (
                <button key={d.id} className="rounded-lg border border-stone-700 bg-stone-900/60 p-2 text-left hover:border-amber-200/50"
                  onClick={() => zoom({ title: d.species, images: [monsterUrl(d.art), monsterUrl(d.art, 'back')], caption: `${monsterSummary(d)}${d.world ? `\nFrom ${WORLDS[d.world].name}` : '\nBlack and white: unaffected by gate closing'}` })}>
                  <div className="flex gap-1">
                    <img src={monsterUrl(d.art)} alt="" className="h-16 w-16" />
                    <img src={monsterUrl(d.art, 'back')} alt="" className="h-16 w-16" />
                  </div>
                  <div className="mt-1 text-sm text-amber-50">{d.species}{d.cls ? <span className="text-stone-400"> &lt;{d.cls}&gt;</span> : null}</div>
                  <div className="text-xs text-stone-400">{monsterSummary(d)}</div>
                </button>
              ))}
            </div>
          )}
          {tab === 'cards' && (
            <>
              <h3 className="mb-2 font-display text-lg text-amber-100">Items</h3>
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ITEMS.map((c) => (
                  <button key={c.id} onClick={() => zoom({ title: c.name, images: [cardUrl(c.id)], caption: `${c.count} in the deck. ${c.text}` })} className="text-left">
                    <img src={cardUrl(c.id)} alt={c.name} className="w-full rounded" />
                    <span className="text-xs text-stone-400">×{c.count}</span>
                  </button>
                ))}
              </div>
              <h3 className="mb-2 font-display text-lg text-amber-100">Spells</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SPELLS.map((c) => (
                  <button key={c.id} onClick={() => zoom({ title: c.name, images: [cardUrl(c.id)], caption: `${c.count} in the deck. ${c.text}` })} className="text-left">
                    <img src={cardUrl(c.id)} alt={c.name} className="w-full rounded" />
                    <span className="text-xs text-stone-400">×{c.count}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
