import { Game, type Flow } from './game';
import type { Answer, GameState, Prompt, Setup } from './types';

export interface SaveGame {
  version: 1;
  setup: Setup;
  answers: Answer[];
}

/**
 * Drives a Game: holds the live generator, validates answers, and records them.
 * The recorded (setup, answers) pair fully reproduces the game — it is what gets saved,
 * and what an online host would broadcast.
 */
export class Session {
  game: Game;
  prompt: Prompt | null = null;
  readonly answers: Answer[] = [];
  private flow: Flow;

  constructor(readonly setup: Setup, answers: Answer[] = []) {
    this.game = new Game(setup);
    this.flow = this.game.run();
    this.step(undefined);
    for (const a of answers) {
      if (!this.prompt) break;
      this.apply(a);
    }
  }

  get state(): GameState {
    return this.game.state;
  }

  /** Who must answer: investigator id, or null when any player may. */
  get waitingFor() {
    return this.prompt?.inv ?? null;
  }

  isValid(a: Answer): boolean {
    const p = this.prompt;
    if (!p) return false;
    const enabled = new Set(p.options.filter((o) => !o.disabled).map((o) => o.key));
    if (p.multi) return Array.isArray(a) && a.every((k) => enabled.has(k));
    return typeof a === 'string' && enabled.has(a);
  }

  /** Apply an answer. Returns false (and changes nothing) if it is not valid for the current prompt. */
  answer(a: Answer): boolean {
    if (!this.isValid(a)) return false;
    this.apply(a);
    return true;
  }

  private apply(a: Answer) {
    this.answers.push(a);
    this.step(a);
  }

  private step(a: Answer | undefined) {
    const r = this.flow.next(a as Answer);
    this.prompt = r.done ? null : (r.value as Prompt);
  }

  save(): SaveGame {
    return { version: 1, setup: this.setup, answers: [...this.answers] };
  }

  static load(save: SaveGame): Session {
    return new Session(save.setup, save.answers);
  }

  /** Undo the last answer by replaying everything before it. */
  undo(): Session {
    return new Session(this.setup, this.answers.slice(0, -1));
  }
}
