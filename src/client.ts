/**
 * The UI talks to the game only through a GameClient. Hotseat uses LocalClient; online play
 * uses RemoteClient (src/net/RemoteClient.ts), which forwards answers to the server and replays
 * the broadcast stream — the engine is deterministic, so every peer computes the same state.
 */
import { Session, type SaveGame } from './engine';
import type { Answer, GameState, Prompt, Setup } from './engine';

export interface Snapshot {
  state: GameState;
  prompt: Prompt | null;
  version: number;
}

export interface GameClient {
  snapshot(): Snapshot;
  subscribe(fn: () => void): () => void;
  answer(a: Answer): boolean;
  /** Players this client may answer for (hotseat: all). */
  controls(player: number): boolean;
  /** Whether this client may answer the given prompt now. */
  canAnswer(prompt: Prompt): boolean;
  canUndo(): boolean;
  undo(): void;
  save(): SaveGame;
}

const AUTOSAVE_KEY = 'arkham1987.autosave';

export class LocalClient implements GameClient {
  private session: Session;
  private listeners = new Set<() => void>();
  private snap: Snapshot;

  constructor(setupOrSave: Setup | SaveGame) {
    this.session = 'answers' in setupOrSave ? Session.load(setupOrSave) : new Session(setupOrSave);
    this.snap = this.makeSnap(0);
    if (import.meta.env.DEV) (globalThis as Record<string, unknown>).__arkham = this;
  }

  private makeSnap(version: number): Snapshot {
    return { state: this.session.state, prompt: this.session.prompt, version };
  }

  private changed() {
    this.snap = this.makeSnap(this.snap.version + 1);
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(this.session.save()));
    } catch {
      /* storage unavailable */
    }
    for (const fn of this.listeners) fn();
  }

  snapshot = () => this.snap;

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  answer(a: Answer) {
    const ok = this.session.answer(a);
    if (ok) this.changed();
    return ok;
  }

  controls() {
    return true;
  }

  canAnswer() {
    return true;
  }

  canUndo() {
    return this.session.answers.length > 0;
  }

  undo() {
    this.session = this.session.undo();
    this.changed();
  }

  save() {
    return this.session.save();
  }

  static autosave(): SaveGame | null {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      return raw ? (JSON.parse(raw) as SaveGame) : null;
    } catch {
      return null;
    }
  }

  static clearAutosave() {
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch {
      /* ignore */
    }
  }
}
