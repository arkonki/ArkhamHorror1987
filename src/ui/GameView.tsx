import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { GameClient } from '../client';
import type { Answer, GameState, Prompt } from '../engine';
import { Board } from './Board';
import { DiceTray } from './Dice';
import { Reference } from './Reference';
import { ZoomProvider } from './Zoom';
import { InvestigatorPanel } from './InvestigatorPanel';
import { PromptPanel } from './PromptPanel';

const LOG_COLORS = { mythos: 'text-purple-300', combat: 'text-red-300', roll: 'text-stone-400', info: 'text-amber-200', warn: 'text-orange-300' } as const;

interface Props {
  client: GameClient;
  onQuit: () => void;
  /** Online extras: room badge in the header, a waiting panel, and chat. */
  headerExtra?: ReactNode;
  waiting?: (state: GameState, prompt: Prompt) => ReactNode;
  chat?: ReactNode;
}

export function GameView({ client, onQuit, headerExtra, waiting, chat }: Props) {
  const snap = useSyncExternalStore(client.subscribe, client.snapshot);
  const { state, prompt } = snap;
  const logRef = useRef<HTMLDivElement>(null);
  const [seenSeq, setSeenSeq] = useState(() => state.rollSeq);
  const [showRef, setShowRef] = useState(false);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [snap.version]);

  // Answering marks the current dice as seen; the tray then shows what the answer caused.
  const answer = (a: Answer) => {
    const before = state.rollSeq;
    if (client.answer(a)) setSeenSeq(before);
  };
  const fresh = state.rolls.filter((r) => (r.seq ?? 0) > seenSeq);

  const download = () => {
    const blob = new Blob([JSON.stringify(client.save())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `arkham-turn${state.turn}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const btn = 'rounded border border-stone-600 px-2 py-1 text-xs text-stone-300 hover:bg-stone-800 disabled:opacity-40';
  return (
    <ZoomProvider>
      <div className="flex min-h-screen flex-col lg:h-screen">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-stone-800 bg-stone-950/80 px-4 py-2">
          <h1 className="font-display text-xl text-amber-100">Arkham Horror</h1>
          <span className="text-sm text-stone-400">
            Turn {state.turn} · {state.phase === 'mythos' ? 'Mythos Phase' : state.phase === 'over' ? 'Game over' : 'Investigator Phase'}
          </span>
          <span className="text-sm text-red-300">Doom {state.doom}/13</span>
          <span className="text-sm text-purple-300">Open gates {Object.values(state.gates).filter((g) => g.location).length}</span>
          {headerExtra}
          <div className="ml-auto flex gap-2">
            <button className={btn} onClick={() => setShowRef(true)}>Reference</button>
            <button className={btn} disabled={!client.canUndo()} onClick={() => client.undo()}>Undo</button>
            <button className={btn} onClick={download}>Save file</button>
            <button className={btn} onClick={onQuit}>Menu</button>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-3 p-3 pb-[48vh] lg:min-h-0 lg:flex-row lg:pb-3">
          <section className="lg:min-h-0 lg:flex-1">
            <Board state={state} prompt={prompt && client.canAnswer(prompt) ? prompt : null} onNode={(n) => answer(n)} />
          </section>
          <aside className="flex w-full flex-col gap-3 lg:min-h-0 lg:w-[420px]">
            <div className="fixed inset-x-0 bottom-0 z-30 flex max-h-[46vh] flex-col gap-2 overflow-y-auto rounded-t-xl border-t border-amber-200/30 bg-stone-900/95 p-3 shadow-2xl backdrop-blur lg:static lg:max-h-[60vh] lg:rounded-lg lg:border lg:border-amber-200/20 lg:bg-stone-900/80 lg:p-4">
              <DiceTray rolls={fresh} onDismiss={() => setSeenSeq(state.rollSeq)} />
              {!prompt ? <GameOver state={state} onQuit={onQuit} />
                : client.canAnswer(prompt) || !waiting ? <PromptPanel state={state} prompt={prompt} onAnswer={answer} />
                : waiting(state, prompt)}
            </div>
            <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-rows-2">
              <div className="overflow-y-auto pr-1 lg:min-h-0">
                <InvestigatorPanel state={state} />
              </div>
              <div className="flex flex-col gap-2 lg:min-h-0">
                <div ref={logRef} className="max-h-64 flex-1 overflow-y-auto rounded-lg border border-stone-800 bg-stone-950/70 p-2 text-xs leading-relaxed lg:max-h-none lg:min-h-0">
                  {state.log.map((l, i) => (
                    <div key={i} className={l.kind ? LOG_COLORS[l.kind] : 'text-stone-200'}>
                      {l.text}
                    </div>
                  ))}
                </div>
                {chat}
              </div>
            </div>
          </aside>
        </main>
        {showRef && <Reference onClose={() => setShowRef(false)} />}
      </div>
    </ZoomProvider>
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
