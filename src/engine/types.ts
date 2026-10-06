import type { LocationId, WorldId, SkillName } from './data/effects';
import type { GateTableVariant } from './data/locations';

export type InvId = string;

/** Where a piece is. Street spaces and locations are Arkham "nodes" (`s12`, `loc:woods`). */
export type Place =
  | { t: 'arkham'; node: string }
  | { t: 'world'; world: WorldId; box: 1 | 2; gate: string | null; returnTo?: LocationId; keyReturn?: string };

export interface Card {
  uid: string;
  id: string;
}

export interface Investigator {
  id: InvId;
  defId: string;
  name: string;
  player: number;
  str: number;
  san: number;
  money: number;
  skillCards: string[];
  items: Card[];
  spells: Card[];
  /** null: no charity card; 'ready'; 'owed' = flipped to "Repay Charity With Good Works". */
  charity: 'ready' | 'owed' | null;
  retainer: boolean;
  localChars: string[];
  automobile: boolean;
  place: Place;
  /** Turns to lose (handcuffs, pit, "stay in box"). */
  lostTurns: number;
  /** Turns left in jail. */
  jailTurns: number;
  /** Gate whose both sides have been found (returned through it and still at its location). */
  foundGate: string | null;
  trophies: { monsters: string[]; gates: string[] };
  /** Spell card uids already used (face down) this turn. */
  usedSpells: string[];
  /** Per-turn flags. */
  turn: { autoSneak?: boolean; usedPiccolo?: boolean; usedHealingStone?: boolean; usedCar?: boolean; holyWater?: boolean; fleshWard?: boolean };
  /** Monster uids this investigator already made a sanity roll against this game turn. */
  sanityRolled: string[];
  tempSneak: number;
  nextMove: 'd6' | number | null;
  /** Bound monster (Bind Monster spell) travelling with the investigator. */
  bound: string | null;
  /** Silver Key marker: the Arkham node the key returns to from the Dreamlands. */
  silverKey: string | null;
  /** OPTION rescue: lost in an Other World, waiting where they fell. */
  stranded?: boolean;
  /** The stranded investigator's player chose to wait instead of starting a new investigator. */
  waiting?: boolean;
  /** Lost/killed: a replacement investigator joins next turn. */
  out?: boolean;
  /** The game turn from which this investigator acts (replacements start next turn). */
  activeFrom: number;
}

export interface MonsterInst {
  uid: string;
  def: string;
  /** null while in the cup, trophy pile, or out of play. */
  node: string | null;
  /** Previous node — defines heading for handed monsters. */
  prev: string | null;
  /** The street node the arrow points at (set when the monster is oriented on appearance or release). */
  exit: string | null;
  vampireBonus: number;
}

export interface GateInst {
  uid: string;
  world: WorldId;
  sp: number;
  location: LocationId | null;
  faceUp: boolean;
}

export interface Options {
  gateTable: GateTableVariant;
  /** OPTION: failing a Fast Talk while bargaining raises the cost by $1. */
  fastTalkPenalty: boolean;
  /** OPTION: two investigators in the same space who both attack monsters each get +1 Fight. */
  teamFightBonus: boolean;
  /** OPTION: use accumulated gate SP to decide First Citizen. */
  honorByGateSp: boolean;
  /** Players point each new monster's arrow (as on the table) instead of a random heading. */
  orientMonsters: boolean;
  /** OPTION: an investigator lost in an Other World can be rescued by another landing on the same box. */
  rescueLost: boolean;
  /** OPTION: Strength limits the number of items an investigator can pick up. */
  carryLimit: boolean;
}

export interface SetupInvestigator {
  defId: string;
  player: number;
  str: number;
}

export interface Setup {
  seed: number;
  players: { name: string }[];
  investigators: SetupInvestigator[];
  options: Options;
}

export interface LogEntry {
  turn: number;
  text: string;
  kind?: 'mythos' | 'combat' | 'roll' | 'info' | 'warn';
}

export interface DiceShown {
  /** Sequence number (increasing) so the UI can tell which rolls are new. */
  seq?: number;
  label: string;
  dice: number[];
  target?: number;
  success?: boolean;
}

export interface GameState {
  setup: Setup;
  turn: number;
  phase: 'investigator' | 'mythos' | 'over';
  active: InvId | null;
  order: InvId[];
  investigators: Record<InvId, Investigator>;
  monsters: Record<string, MonsterInst>;
  cup: string[];
  gates: Record<string, GateInst>;
  gateDeck: string[];
  doom: number;
  /** Elder Signs placed on locations. */
  elderSigns: LocationId[];
  itemDeck: string[];
  itemDiscard: string[];
  spellDeck: string[];
  spellDiscard: string[];
  skillDeck: string[];
  retainersLeft: number;
  localCharsLeft: string[];
  /** Turn at which the gate count first stood at/over the limit (for "present for a full game turn"). */
  overrunSince: number | null;
  log: LogEntry[];
  lastRoll: DiceShown | null;
  /** Every roll this game turn, oldest first (cleared each game turn). */
  rolls: DiceShown[];
  rollSeq: number;
  /** Paths walked by monsters in the last Mythos movement step (for animation). */
  monsterMoves: Record<string, string[]>;
  moveSeq: number;
  result: null | { victory: boolean; reason: string; honor: HonorEntry[] };
  uidCounter: number;
}

export interface HonorEntry {
  inv: InvId;
  name: string;
  player: string;
  gates: number;
  gateSp: number;
  monsterSp: number;
  survived: boolean;
}

export interface PromptOption {
  key: string;
  label: string;
  /** Extra info for the UI (e.g. a node id to highlight, a card id). */
  ref?: string;
  disabled?: string;
}

export type PromptKind =
  | 'choice'
  | 'move'
  | 'destination'
  | 'combat'
  | 'cards'
  | 'bid'
  | 'orient'
  | 'newInvestigator'
  | 'ack';

export interface Prompt {
  kind: PromptKind;
  /** Investigator who decides (null = any player, e.g. acknowledgements in hotseat). */
  inv: InvId | null;
  title: string;
  text?: string;
  options: PromptOption[];
  /** For 'cards': allow choosing several. */
  multi?: boolean;
  /** Node ids the UI may highlight/click as answers (keys equal node ids). */
  nodes?: string[];
  /** Arbitrary extra context for specialised UIs. */
  data?: Record<string, unknown>;
}

/** An answer is an option key, or a list of keys for multi-select prompts. */
export type Answer = string | string[];

export type { LocationId, WorldId, SkillName };
