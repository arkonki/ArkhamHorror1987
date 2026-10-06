import { GATES, GATE_COPIES, ITEMS, LOCAL_CHARACTERS, RETAINER_CARDS, SKILL_CARDS, SPELLS } from './data/cards';
import { INVESTIGATOR_BY_ID } from './data/investigators';
import { MONSTERS } from './data/monsters';
import type { Rng } from './rng';
import type { GameState, Investigator, Options, Setup } from './types';

export const DEFAULT_OPTIONS: Options = {
  gateTable: 'rules',
  fastTalkPenalty: false,
  teamFightBonus: false,
  honorByGateSp: false,
};

export const START_NODE = 'loc:train_station';

function expand<T extends { id: string; count: number }>(defs: T[]): string[] {
  return defs.flatMap((d) => Array.from({ length: d.count }, () => d.id));
}

export function newInvestigator(state: GameState, defId: string, player: number, str: number, activeFrom: number): Investigator {
  const def = INVESTIGATOR_BY_ID[defId];
  const s = Math.max(3, Math.min(7, str));
  return {
    id: `inv${state.uidCounter++}`,
    defId,
    name: def.name,
    player,
    str: s,
    san: 10 - s,
    money: 13,
    skillCards: [],
    items: [],
    spells: [],
    charity: 'ready',
    retainer: false,
    localChars: [],
    automobile: false,
    place: { t: 'arkham', node: START_NODE },
    lostTurns: 0,
    jailTurns: 0,
    foundGate: null,
    trophies: { monsters: [], gates: [] },
    usedSpells: [],
    turn: {},
    sanityRolled: [],
    tempSneak: 0,
    nextMove: null,
    activeFrom,
  };
}

/** Build the initial state (decks shuffled, investigators created) — setup steps 1, 2, 4, 5, 6. */
export function createState(setup: Setup, rng: Rng): GameState {
  const state: GameState = {
    setup,
    turn: 1,
    phase: 'investigator',
    active: null,
    order: [],
    investigators: {},
    monsters: {},
    cup: [],
    gates: {},
    gateDeck: [],
    doom: 0,
    elderSigns: [],
    itemDeck: rng.shuffle(expand(ITEMS)),
    itemDiscard: [],
    spellDeck: rng.shuffle(expand(SPELLS)),
    spellDiscard: [],
    skillDeck: rng.shuffle(expand(SKILL_CARDS)),
    retainersLeft: RETAINER_CARDS,
    localCharsLeft: LOCAL_CHARACTERS.map((c) => c.id),
    overrunSince: null,
    log: [],
    lastRoll: null,
    result: null,
    uidCounter: 1,
  };

  for (const def of MONSTERS) {
    const uid = `mon${state.uidCounter++}`;
    state.monsters[uid] = { uid, def: def.id, node: null, prev: null, vampireBonus: 0 };
    state.cup.push(uid);
  }
  rng.shuffle(state.cup);

  for (const g of GATES) {
    for (let i = 0; i < GATE_COPIES; i++) {
      const uid = `gate${state.uidCounter++}`;
      state.gates[uid] = { uid, world: g.world, sp: g.sp, location: null, faceUp: false };
      state.gateDeck.push(uid);
    }
  }
  rng.shuffle(state.gateDeck);

  for (const si of setup.investigators) {
    const inv = newInvestigator(state, si.defId, si.player, si.str, 1);
    state.investigators[inv.id] = inv;
    state.order.push(inv.id);
  }
  return state;
}

/** Number of gates that loses the game when present for a full game turn. */
export function gateLimit(state: GameState): number {
  const n = Object.values(state.investigators).filter((i) => !i.out).length;
  if (n <= 3) return 8;
  if (n === 4) return 7;
  return 6;
}
