import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { GameState, Prompt } from '../engine';
import { INVESTIGATOR_BY_ID } from '../engine/data/investigators';
import { seatForPrompt } from '../net/protocol';
import type { RemoteClient } from '../net/RemoteClient';
import { GameView } from './GameView';

/** Wraps GameView for online play: connection screen, seats, waiting state, chat. */
export function OnlineGame({ client, onQuit }: { client: RemoteClient; onQuit: () => void }) {
  useSyncExternalStore(client.subscribe, () => client.version);
  const [seatsOpen, setSeatsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (client.room) {
      const url = new URL(location.href);
      url.searchParams.set('room', client.room);
      history.replaceState(null, '', url);
    }
  }, [client.room]);

  const quit = () => {
    client.close();
    const url = new URL(location.href);
    url.searchParams.delete('room');
    history.replaceState(null, '', url);
    onQuit();
  };

  if (!client.ready()) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="font-display text-3xl text-amber-100">Arkham Horror</h1>
        {client.error ? <p className="text-red-300">{client.error}</p> : <p className="animate-pulse text-stone-300">Connecting to the game server…</p>}
        <button onClick={quit} className="rounded border border-stone-600 px-3 py-1 text-stone-300 hover:bg-stone-800">Back to menu</button>
      </div>
    );
  }

  const mine = client.mySeats();
  const showSeats = seatsOpen || (mine.length === 0 && !dismissed);
  return (
    <>
      <GameView
        client={client}
        onQuit={quit}
        headerExtra={<RoomBadge client={client} onSeats={() => setSeatsOpen(true)} />}
        waiting={(state, prompt) => <Waiting client={client} state={state} prompt={prompt} />}
        chat={<Chat client={client} />}
      />
      {showSeats && <SeatPicker client={client} onClose={() => { setSeatsOpen(false); setDismissed(true); }} />}
      {client.error && (
        <div className="fixed left-1/2 top-14 z-50 -translate-x-1/2 rounded-lg border border-red-400/50 bg-red-950/95 px-4 py-2 text-sm text-red-100 shadow-xl" role="alert">
          {client.error}
          <button onClick={() => client.clearError()} className="ml-3 text-red-300 hover:text-white" aria-label="Dismiss">✕</button>
        </div>
      )}
    </>
  );
}

function RoomBadge({ client, onSeats }: { client: RemoteClient; onSeats: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}${location.pathname}?room=${client.room}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      prompt('Share this link', link);
    }
  };
  const dot = client.status === 'online' ? 'bg-green-400' : 'animate-pulse bg-amber-400';
  return (
    <span className="flex items-center gap-2 text-sm">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} title={client.status} />
      <span className="text-stone-400">{client.status === 'online' ? 'Room' : 'Reconnecting…'}</span>
      <button onClick={copy} className="rounded border border-amber-300/50 px-2 font-mono tracking-widest text-amber-200 hover:bg-amber-200/10" title="Copy invite link">
        {copied ? 'Link copied' : client.room}
      </button>
      <button onClick={onSeats} className="rounded border border-stone-600 px-2 py-0.5 text-xs text-stone-300 hover:bg-stone-800">Seats</button>
    </span>
  );
}

function SeatPicker({ client, onClose }: { client: RemoteClient; onClose: () => void }) {
  const state = client.snapshot().state;
  const invsOf = (seat: number) => Object.values(state.investigators).filter((i) => i.player === seat && !i.out);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-label="Choose your seats">
      <div className="w-full max-w-lg rounded-xl border border-amber-200/30 bg-stone-900 p-5 shadow-2xl">
        <h2 className="font-display text-2xl text-amber-50">Choose your seat</h2>
        <p className="mt-1 text-sm text-stone-400">Take one or more seats. You answer every decision for the investigators in your seats. Share the room code <b className="font-mono text-amber-200">{client.room}</b> with the others.</p>
        <ul className="mt-4 grid gap-2">
          {client.seats.map((s) => (
            <li key={s.seat} className={`flex items-center gap-3 rounded-lg border p-3 ${s.mine ? 'border-amber-300/70 bg-amber-950/30' : 'border-stone-700'}`}>
              <div className="flex-1">
                <div className="font-display text-lg text-amber-50">{s.name}</div>
                <div className="text-xs text-stone-400">{invsOf(s.seat).map((i) => i.name).join(', ') || 'No investigators'}</div>
                <div className="text-xs">
                  {s.mine ? <span className="text-amber-300">You</span>
                    : s.holder ? <span className="text-stone-300">{s.holder}{s.online ? '' : ' (away)'}</span>
                    : <span className="text-green-400">Free</span>}
                </div>
              </div>
              {s.mine ? (
                <button onClick={() => client.release(s.seat)} className="rounded border border-stone-600 px-3 py-1 text-sm text-stone-300 hover:bg-stone-800">Leave</button>
              ) : s.holder ? (
                client.host && <button onClick={() => client.release(s.seat)} className="rounded border border-red-400/50 px-3 py-1 text-sm text-red-300 hover:bg-red-950" title="Free this seat so someone else can take it">Free</button>
              ) : (
                <button onClick={() => client.claim(s.seat)} className="rounded border border-amber-300 bg-amber-300 px-3 py-1 text-sm font-semibold text-stone-900">Take</button>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded border border-stone-600 px-3 py-1 text-sm text-stone-200 hover:bg-stone-800">
            {client.mySeats().length ? 'Done' : 'Just watch'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Waiting({ client, state, prompt }: { client: RemoteClient; state: GameState; prompt: Prompt }) {
  const seat = seatForPrompt(state, prompt);
  const info = seat === null ? null : client.seats[seat];
  const inv = prompt.inv ? state.investigators[prompt.inv] : null;
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-widest text-stone-400">
        {inv && <span className="inline-block h-3 w-3 rounded-full border border-white" style={{ background: INVESTIGATOR_BY_ID[inv.defId].pawn }} />}
        Waiting
      </div>
      <h2 className="font-display text-xl text-amber-50">{prompt.title}</h2>
      <p className="mt-2 animate-pulse text-sm text-stone-300">
        {client.status !== 'online' ? 'Reconnecting to the server…'
          : seat === null ? 'Any seated player may decide.'
          : info?.holder ? `Waiting for ${info.holder} (${info.name})${info.online ? '…' : ' — they are away.'}`
          : `${info?.name ?? 'This seat'} has no player.`}
      </p>
      {info && !info.holder && (
        <button onClick={() => client.claim(info.seat)} className="mt-3 rounded border border-amber-300 bg-amber-300 px-3 py-1 text-sm font-semibold text-stone-900">
          Take the {info.name} seat
        </button>
      )}
    </div>
  );
}

function Chat({ client }: { client: RemoteClient }) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [client.chat.length]);
  return (
    <div className="flex min-h-0 flex-col rounded-lg border border-stone-800 bg-stone-950/70">
      <div ref={ref} className="max-h-32 min-h-12 flex-1 overflow-y-auto p-2 text-xs leading-relaxed">
        {client.chat.length === 0 && <div className="text-stone-500">Table talk appears here.</div>}
        {client.chat.map((m, i) => (
          <div key={i}><b className="text-amber-200">{m.from}:</b> <span className="text-stone-200">{m.text}</span></div>
        ))}
      </div>
      <form
        className="flex border-t border-stone-800"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) client.say(text);
          setText('');
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Say something…" aria-label="Chat message" className="flex-1 bg-transparent px-2 py-1 text-sm text-stone-100 outline-none" />
        <button className="px-3 text-sm text-amber-200 hover:bg-stone-800">Send</button>
      </form>
    </div>
  );
}
