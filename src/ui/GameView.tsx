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
  const [showLog, setShowLog] = useState(false);
  const [mapOnly, setMapOnly] = useState(false);
  const [cardMin, setCardMin] = useState(false);
  const [seenLog, setSeenLog] = useState(() => state.log.length);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
    if (showLog) setSeenLog(state.log.length);
  }, [snap.version, showLog]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowLog(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  const btn = 'rounded border border-stone-600 px-2.5 py-1 text-sm text-stone-300 hover:bg-stone-800 disabled:opacity-40';
  const unread = Math.max(0, state.log.length - seenLog);
  const openLog = () => { setShowLog(true); setSeenLog(state.log.length); };
  return (
    <ZoomProvider>
      <div className="flex min-h-screen flex-col lg:h-screen">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-stone-800 bg-stone-950/80 px-3 py-1.5">
          <h1 className="font-display text-xl text-amber-100">Arkham Horror</h1>
          <span className="text-sm text-stone-400">
            Turn {state.turn} · {state.phase === 'mythos' ? 'Mythos Phase' : state.phase === 'over' ? 'Game over' : 'Investigator Phase'}
          </span>
          <span className="text-sm text-red-300">Doom {state.doom}/13</span>
          <span className="text-sm text-purple-300">Open gates {Object.values(state.gates).filter((g) => g.location).length}</span>
          {headerExtra}
          <div className="ml-auto flex gap-2">
            <button className={`${btn} relative`} onClick={() => (showLog ? setShowLog(false) : openLog())} aria-expanded={showLog}>
              Log{chat ? ' & chat' : ''}
              {unread > 0 && !showLog && <span className="absolute -right-1.5 -top-1.5 rounded-full bg-amber-300 px-1.5 text-[10px] font-bold text-stone-900">{unread > 99 ? '99+' : unread}</span>}
            </button>
            <button className={`${btn} hidden lg:block ${mapOnly ? 'border-amber-300 text-amber-100' : ''}`} onClick={() => setMapOnly(!mapOnly)} aria-pressed={mapOnly} title="Hide the investigator dashboard so the map gets the full width">
              {mapOnly ? 'Show dashboard' : 'Map only'}
            </button>
            <button className={btn} onClick={() => setShowRef(true)}>Reference</button>
            <button className={btn} disabled={!client.canUndo()} onClick={() => client.undo()}>Undo</button>
            <button className={btn} onClick={download}>Save file</button>
            <button className={btn} onClick={onQuit}>Menu</button>
          </div>
        </header>
        <main className="relative flex flex-1 flex-col gap-2 p-2 pb-[48vh] lg:min-h-0 lg:flex-row lg:pb-2">
          <section className="min-h-[60vh] min-w-0 lg:min-h-0 lg:flex-1">
            <Board state={state} prompt={prompt && client.canAnswer(prompt) ? prompt : null} onNode={(n) => answer(n)} />
          </section>
          <aside className={`flex w-full flex-col gap-2 lg:min-h-0 ${mapOnly ? 'lg:w-0' : 'lg:w-[clamp(320px,24vw,420px)]'}`}>
            <div className={`fixed inset-x-0 bottom-0 z-30 flex max-h-[46vh] flex-col gap-2 overflow-y-auto rounded-t-xl border-t border-amber-200/30 bg-stone-900/95 p-3 shadow-2xl backdrop-blur ${mapOnly ? 'lg:bottom-4 lg:left-auto lg:right-4 lg:w-[340px] lg:max-h-[72vh] lg:rounded-xl lg:border' : 'lg:static lg:max-h-[58%] lg:shrink-0 lg:rounded-xl lg:border lg:border-amber-200/25 lg:bg-stone-900/90 lg:p-3'}`}>
              {mapOnly && (
                <button className="hidden items-center gap-2 rounded border border-stone-600 px-2 py-1 text-left text-sm text-stone-300 hover:bg-stone-800 lg:flex" onClick={() => setCardMin(!cardMin)} aria-expanded={!cardMin}>
                  <span className="font-bold text-amber-200">{cardMin ? '▸' : '▾'}</span>
                  <span className="truncate">{cardMin ? (prompt?.title ?? 'Game over') : 'Minimise to see the map'}</span>
                </button>
              )}
              <div className={`flex flex-col gap-2 ${mapOnly && cardMin ? 'lg:hidden' : ''}`}>
                <DiceTray rolls={fresh} onDismiss={() => setSeenSeq(state.rollSeq)} />
                {!prompt ? <GameOver state={state} onQuit={onQuit} />
                  : client.canAnswer(prompt) || !waiting ? <PromptPanel state={state} prompt={prompt} onAnswer={answer} />
                  : waiting(state, prompt)}
              </div>
            </div>
            <div className={`overflow-y-auto pr-1 lg:min-h-0 lg:flex-1 ${mapOnly ? 'lg:hidden' : ''}`}>
              <InvestigatorPanel state={state} />
            </div>
          </aside>
          {/* On-demand log (and chat, when online). Kept mounted so chat scroll and drafts survive closing. */}
          <div
            className={`fixed bottom-0 right-0 top-0 z-40 flex w-[min(440px,100vw)] flex-col gap-2 border-l border-amber-200/25 bg-stone-950/97 p-3 shadow-2xl ${showLog ? '' : 'hidden'}`}
            role="dialog"
            aria-label="Game log"
          >
            <div className="flex items-center">
              <h2 className="font-display text-xl text-amber-50">Game log</h2>
              <button className={`${btn} ml-auto`} onClick={() => setShowLog(false)}>Close ✕</button>
            </div>
            <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-stone-800 bg-stone-950/70 p-2 text-sm leading-relaxed">
              {state.log.map((l, i) => (
                <div key={i} className={l.kind ? LOG_COLORS[l.kind] : 'text-stone-200'}>
                  {l.text}
                </div>
              ))}
            </div>
            {chat}
          </div>
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
