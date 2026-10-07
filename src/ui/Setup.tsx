import { useState } from 'react';
import { INVESTIGATORS } from '../engine/data/investigators';
import { DEFAULT_OPTIONS, type Options, type Setup as SetupData } from '../engine';
import { investigatorUrl } from './assets';

interface Props {
  onStart: (setup: SetupData) => void;
  onHost: (setup: SetupData, name: string) => void;
  onJoin: (room: string, name: string) => void;
  defaultName: string;
  /** Room code from an invite link. */
  defaultRoom?: string;
  onResume?: () => void;
  onLoad: (file: File) => void;
}

interface Pick {
  defId: string;
  player: number;
  str: number;
}

/** Rules: 1 player → 3 investigators; 2–3 players → 2 each. */
function suggested(players: number) {
  return players === 1 ? 3 : players <= 3 ? players * 2 : players;
}

export function Setup({ onStart, onHost, onJoin, defaultName, defaultRoom, onResume, onLoad }: Props) {
  const [mode, setMode] = useState<'hotseat' | 'online'>(defaultRoom ? 'online' : 'hotseat');
  const [name, setName] = useState(defaultName);
  const [code, setCode] = useState(defaultRoom ?? '');
  const [players, setPlayers] = useState(['Player 1']);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS);

  const toggle = (defId: string) => {
    const existing = picks.find((p) => p.defId === defId);
    if (existing) return setPicks(picks.filter((p) => p !== existing));
    const counts = players.map((_, i) => picks.filter((p) => p.player === i).length);
    const player = counts.indexOf(Math.min(...counts));
    setPicks([...picks, { defId, player, str: 5 }]);
  };

  const update = (defId: string, patch: Partial<Pick>) => setPicks(picks.map((p) => (p.defId === defId ? { ...p, ...patch } : p)));

  const start = () => {
    const setup: SetupData = {
      seed: Math.floor(Math.random() * 2 ** 31),
      players: players.map((p) => ({ name: p })),
      investigators: picks,
      options,
    };
    if (mode === 'online') onHost(setup, name.trim());
    else onStart(setup);
  };
  const canStart = picks.length > 0 && (mode === 'hotseat' || !!name.trim());
  const tab = (m: typeof mode, label: string) => (
    <button onClick={() => setMode(m)} className={`rounded-md px-4 py-1.5 ${mode === m ? 'bg-amber-200 text-stone-900' : 'text-stone-300 hover:bg-stone-800'}`}>{label}</button>
  );
  const input = 'rounded border border-stone-600 bg-stone-800 px-2 py-1 text-stone-100';

  return (
    <div className="mx-auto max-w-6xl p-6">
      <header className="mb-6 text-center">
        <h1 className="font-display text-5xl text-amber-100">Arkham Horror</h1>
        <p className="mt-1 text-stone-400">The Boardgame for Monster-Hunters · Chaosium 1987</p>
      </header>

      {onResume && (
        <div className="mb-6 flex justify-center">
          <button onClick={onResume} className="rounded-md border border-amber-300/60 bg-amber-200/10 px-5 py-2 text-amber-100 hover:bg-amber-200/25">
            Resume saved game
          </button>
        </div>
      )}

      <div className="mb-6 flex justify-center gap-1 rounded-lg border border-stone-700 bg-stone-900/60 p-1" role="tablist">
        {tab('hotseat', 'Hotseat (one screen)')}
        {tab('online', 'Online')}
      </div>

      {mode === 'online' && (
        <section className="mb-6 grid gap-4 rounded-lg border border-amber-200/30 bg-stone-900/60 p-4 md:grid-cols-2">
          <div>
            <h2 className="mb-2 font-display text-xl text-amber-50">Your name</h2>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="e.g. Ann" className={`${input} w-full`} />
            <p className="mt-2 text-xs text-stone-400">To host, pick investigators and rule options below, then press Host online game. You'll get a code and link to share; each player then takes one or more of the player seats.</p>
          </div>
          <div>
            <h2 className="mb-2 font-display text-xl text-amber-50">Join a game</h2>
            <div className="flex flex-wrap items-center gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))} placeholder="Room code" className={`${input} w-32 font-mono tracking-widest`} aria-label="Room code" />
              <button disabled={code.length !== 5 || !name.trim()} onClick={() => onJoin(code, name.trim())} className="rounded-md border border-amber-300 bg-amber-300 px-4 py-1 font-semibold text-stone-900 disabled:opacity-40">
                Join
              </button>
              <span className="text-stone-400">or</span>
              <button disabled={!canStart} onClick={start} className="rounded-md border border-amber-300 bg-amber-300 px-4 py-1 font-semibold text-stone-900 disabled:opacity-40">
                Host online game
              </button>
            </div>
            {!canStart && <p className="mt-2 text-xs text-stone-400">To host, enter your name and pick investigators below.</p>}
          </div>
        </section>
      )}

      <section className="mb-6 rounded-lg border border-stone-700 bg-stone-900/60 p-4">
        <h2 className="mb-2 font-display text-xl text-amber-50">{mode === 'online' ? 'Player seats' : 'Players'}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {players.map((p, i) => (
            <input
              key={i}
              value={p}
              onChange={(e) => setPlayers(players.map((x, j) => (j === i ? e.target.value : x)))}
              className="w-36 rounded border border-stone-600 bg-stone-800 px-2 py-1 text-stone-100"
            />
          ))}
          {players.length < 8 && (
            <button className="rounded border border-stone-600 px-2 py-1 text-stone-300 hover:bg-stone-800" onClick={() => setPlayers([...players, `Player ${players.length + 1}`])}>
              + player
            </button>
          )}
          {players.length > 1 && (
            <button className="rounded border border-stone-600 px-2 py-1 text-stone-300 hover:bg-stone-800" onClick={() => { setPlayers(players.slice(0, -1)); setPicks(picks.map((p) => ({ ...p, player: Math.min(p.player, players.length - 2) }))); }}>
              − player
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-stone-400">
          The rules suggest {suggested(players.length)} investigator{suggested(players.length) > 1 ? 's' : ''} for {players.length} player{players.length > 1 ? 's' : ''} (one player runs three; two or three players run two each).
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-display text-xl text-amber-50">Investigators</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {INVESTIGATORS.map((d) => {
            const pick = picks.find((p) => p.defId === d.id);
            return (
              <div key={d.id} className={`rounded-lg border p-2 ${pick ? 'border-amber-300 bg-amber-950/30' : 'border-stone-700 bg-stone-900/60'}`}>
                <button onClick={() => toggle(d.id)} className="block w-full">
                  <img src={investigatorUrl(d.id)} alt={d.name} className={`w-full rounded ${pick ? '' : 'opacity-70 hover:opacity-100'}`} />
                </button>
                {pick && (
                  <div className="mt-2 grid gap-1 text-sm">
                    <label className="flex items-center justify-between gap-2 text-stone-300">
                      Player
                      <select value={pick.player} onChange={(e) => update(d.id, { player: Number(e.target.value) })} className="rounded bg-stone-800 px-1">
                        {players.map((p, i) => <option key={i} value={i}>{p}</option>)}
                      </select>
                    </label>
                    <label className="text-stone-300">
                      Strength {pick.str} / Sanity {10 - pick.str}
                      <input type="range" min={3} max={7} value={pick.str} onChange={(e) => update(d.id, { str: Number(e.target.value) })} className="w-full" />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-stone-700 bg-stone-900/60 p-4">
        <h2 className="mb-2 font-display text-xl text-amber-50">Rule options</h2>
        <fieldset className="mb-3">
          <legend className="text-sm text-stone-300">Gate Appearance Table — which results bring an extra monster to every gated location?</legend>
          <label className="mr-4 text-sm text-stone-200">
            <input type="radio" checked={options.gateTable === 'rules'} onChange={() => setOptions({ ...options, gateTable: 'rules' })} /> Rules sheet (7 — Founder's Rock)
          </label>
          <label className="text-sm text-stone-200">
            <input type="radio" checked={options.gateTable === 'board'} onChange={() => setOptions({ ...options, gateTable: 'board' })} /> Game board (4 — Lighthouse, 10 — Lake Miskatonic)
          </label>
        </fieldset>
        <label className="block text-sm text-stone-200">
          <input type="checkbox" checked={options.fastTalkPenalty} onChange={(e) => setOptions({ ...options, fastTalkPenalty: e.target.checked })} /> Failing a Fast Talk while bargaining raises the cost by $1
        </label>
        <label className="block text-sm text-stone-200">
          <input type="checkbox" checked={options.teamFightBonus} onChange={(e) => setOptions({ ...options, teamFightBonus: e.target.checked })} /> Investigators fighting in the same space each get +1 Fight
        </label>
        <label className="block text-sm text-stone-200">
          <input type="checkbox" checked={options.orientMonsters} onChange={(e) => setOptions({ ...options, orientMonsters: e.target.checked })} /> Players point each new monster's arrow (off: random heading)
        </label>
        <label className="block text-sm text-stone-200">
          <input type="checkbox" checked={options.rescueLost} onChange={(e) => setOptions({ ...options, rescueLost: e.target.checked })} /> An investigator lost in an Other World can be rescued by another reaching the same box
        </label>
        <label className="block text-sm text-stone-200">
          <input type="checkbox" checked={options.carryLimit} onChange={(e) => setOptions({ ...options, carryLimit: e.target.checked })} /> Strength limits how many items an investigator can pick up
        </label>
        <label className="block text-sm text-stone-200">
          <input type="checkbox" checked={options.honorByGateSp} onChange={(e) => setOptions({ ...options, honorByGateSp: e.target.checked })} /> First Citizen is decided by the total SP of gates closed
        </label>
      </section>

      <div className="flex items-center justify-center gap-3">
        {mode === 'hotseat' && (
          <button disabled={!canStart} onClick={start} className="rounded-md border border-amber-300 bg-amber-300 px-6 py-2 font-semibold text-stone-900 disabled:opacity-40">
            Begin the investigation
          </button>
        )}
        <label className="cursor-pointer rounded-md border border-stone-600 px-4 py-2 text-stone-300 hover:bg-stone-800">
          Load save…
          <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && onLoad(e.target.files[0])} />
        </label>
      </div>
    </div>
  );
}
