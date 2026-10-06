import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { GameClient } from '../client';
import { Board } from './Board';
import { InvestigatorPanel } from './InvestigatorPanel';
import { PromptPanel } from './PromptPanel';

const LOG_COLORS = { mythos: 'text-purple-300', combat: 'text-red-300', roll: 'text-stone-400', info: 'text-amber-200', warn: 'text-orange-300' } as const;

interface Props {
  client: GameClient;
  onQuit: () => void;
}

export function GameView({ client, onQuit }: Props) {
  const snap = useSyncExternalStore(client.subscribe, client.snapshot);
  const { state, prompt } = snap;
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [snap.version]);

  const download = () => {
    const blob = new Blob([JSON.stringify(client.save())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `arkham-turn${state.turn}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const roll = state.lastRoll;
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-stone-800 bg-stone-950/80 px-4 py-2">
        <h1 className="font-display text-xl text-amber-100">Arkham Horror</h1>
        <span className="text-sm text-stone-400">
          Turn {state.turn} · {state.phase === 'mythos' ? 'Mythos Phase' : state.phase === 'over' ? 'Game over' : 'Investigator Phase'}
        </span>
        <span className="text-sm text-red-300">Doom {state.doom}/13</span>
        <span className="text-sm text-purple-300">Open gates {Object.values(state.gates).filter((g) => g.location).length}</span>
        {roll && (
          <span className="ml-4 hidden items-center gap-1 text-sm text-stone-300 md:flex">
            {roll.dice.map((d, i) => (
              <span key={i} className="inline-flex h-6 w-6 items-center justify-center rounded bg-stone-100 font-bold text-stone-900">{d}</span>
            ))}
            <span className={roll.success === undefined ? '' : roll.success ? 'text-green-400' : 'text-red-400'}>{roll.label}</span>
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <button className="rounded border border-stone-600 px-2 py-1 text-xs text-stone-300 hover:bg-stone-800 disabled:opacity-40" disabled={!client.canUndo()} onClick={() => client.undo()}>
            Undo
          </button>
          <button className="rounded border border-stone-600 px-2 py-1 text-xs text-stone-300 hover:bg-stone-800" onClick={download}>
            Save file
          </button>
          <button className="rounded border border-stone-600 px-2 py-1 text-xs text-stone-300 hover:bg-stone-800" onClick={onQuit}>
            Menu
          </button>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
        <section className="min-h-[50vh] flex-1 lg:min-h-0">
          <Board state={state} prompt={prompt} onNode={(n) => client.answer(n)} />
        </section>
        <aside className="flex w-full min-h-0 flex-col gap-3 lg:w-[420px]">
          <div className="rounded-lg border border-amber-200/20 bg-stone-900/80 p-4 shadow-xl">
            {prompt ? <PromptPanel state={state} prompt={prompt} onAnswer={(a) => client.answer(a)} /> : <GameOver state={state} onQuit={onQuit} />}
          </div>
          <div className="grid min-h-0 flex-1 grid-rows-2 gap-3">
            <div className="min-h-0 overflow-y-auto pr-1">
              <InvestigatorPanel state={state} />
            </div>
            <div ref={logRef} className="min-h-0 overflow-y-auto rounded-lg border border-stone-800 bg-stone-950/70 p-2 text-xs leading-relaxed">
              {state.log.map((l, i) => (
                <div key={i} className={l.kind ? LOG_COLORS[l.kind] : 'text-stone-200'}>
                  {l.text}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function GameOver({ state, onQuit }: { state: ReturnType<GameClient['snapshot']>['state']; onQuit: () => void }) {
  const r = state.result;
  if (!r) return null;
  return (
    <div>
      <h2 className={`font-display text-3xl ${r.victory ? 'text-amber-200' : 'text-red-300'}`}>{r.victory ? 'Victory' : 'Defeat'}</h2>
      <p className="mt-2 text-sm text-stone-300">{r.reason}</p>
      <h3 className="mt-4 font-display text-lg text-amber-50">Roll of Honor</h3>
      <table className="mt-1 w-full text-sm text-stone-200">
        <thead className="text-xs text-stone-400">
          <tr><th className="text-left">Investigator</th><th>Gates</th><th>Monster SP</th></tr>
        </thead>
        <tbody>
          {r.honor.map((h, i) => (
            <tr key={h.inv} className={i === 0 && r.victory ? 'text-amber-200' : ''}>
              <td>{i === 0 && r.victory ? '★ ' : ''}{h.name} <span className="text-stone-500">({h.player})</span></td>
              <td className="text-center">{h.gates}</td>
              <td className="text-center">{h.monsterSp}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {r.victory && r.honor[0] && <p className="mt-2 text-xs text-stone-400">{r.honor[0].name} is honored as First Citizen of Arkham.</p>}
      <button onClick={onQuit} className="mt-4 rounded border border-stone-600 px-3 py-1 text-sm text-stone-200 hover:bg-stone-800">Back to menu</button>
    </div>
  );
}
