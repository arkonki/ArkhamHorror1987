import {
  Card,
  GameState,
  Investigator,
  InvestigatorColor,
  LogMessage,
  Monster,
  Gate,
  OtherWorldId
} from '../types/game';
import {
  GATE_APPEARANCE_TABLE,
  INITIAL_ITEMS,
  INITIAL_MONSTERS,
  INITIAL_SKILLS,
  INITIAL_SPELLS,
  LOCATIONS_DATA,
  OTHER_WORLDS
} from '../data/rules1987';
import {
  BOARD_NODES,
  getNeighbors,
  getReachableNodes,
  findShortestPath,
  getNodeForLocation,
  getNodeDisplayLabel
} from '../data/boardGraph';

export const WORLD_KEYS: OtherWorldId[] = [
  'abyss',
  'another_dimension',
  'city_of_great_race',
  'earths_dreamlands',
  'great_hall_of_celeano',
  'plateau_of_leng',
  'rlyeh',
  'yuggoth'
];

const MAX_LOG_ENTRIES = 250;

let uid = 0;
export function makeId(prefix: string): string {
  uid += 1;
  return `${prefix}_${Date.now().toString(36)}_${uid}`;
}

export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function roll2D6(): { d1: number; d2: number; sum: number } {
  const d1 = rollD6();
  const d2 = rollD6();
  return { d1, d2, sum: d1 + d2 };
}

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// -------------------------------------------------------------
// Small immutable state helpers
// -------------------------------------------------------------
export function addLog(state: GameState, text: string, type: LogMessage['type'] = 'action'): GameState {
  const entry: LogMessage = { id: makeId('log'), timestamp: `T${state.turnNumber}`, type, text };
  const log = [...state.log, entry];
  return { ...state, log: log.length > MAX_LOG_ENTRIES ? log.slice(-MAX_LOG_ENTRIES) : log };
}

export function getInvestigatorIndex(state: GameState, investigatorId: string): number {
  return state.investigators.findIndex(i => i.id === investigatorId);
}

export function patchInvestigator(
  state: GameState,
  idx: number,
  fn: (inv: Investigator) => Investigator
): GameState {
  if (idx < 0 || idx >= state.investigators.length) return state;
  const investigators = state.investigators.map((inv, i) => (i === idx ? fn(inv) : inv));
  return { ...state, investigators };
}

export function getEffectiveStats(inv: Investigator) {
  const has = (id: string) => inv.skills.some(s => s.id === id);
  return {
    fight: inv.stats.fightSkill + (has('skill_fight') ? 1 : 0),
    sneak: inv.stats.sneakSkill + (has('skill_sneak') ? 1 : 0),
    knowledge: inv.stats.knowledgeSkill + (has('skill_knowledge') ? 1 : 0),
    fastTalk: inv.stats.fastTalkSkill + (has('skill_fast_talk') ? 1 : 0)
  };
}

/** Monsters an investigator in Arkham must deal with on their current space. */
export function getThreateningMonsters(state: GameState, inv: Investigator | undefined): Monster[] {
  if (!inv || inv.otherWorldState) return [];
  return state.activeMonsters.filter(
    m => m.currentNodeId === inv.locationNodeId && !state.evadedMonsterIds.includes(m.id)
  );
}

/** Best weapon bonus usable with two hands (used for attacking gates). */
export function getBestWeaponBonus(inv: Investigator): number {
  const weapons = inv.items.filter(i => (i.fightBonus || 0) > 0);
  let best = 0;
  for (let a = 0; a < weapons.length; a++) {
    const wa = weapons[a];
    if ((wa.hands || 1) === 2) {
      best = Math.max(best, wa.fightBonus || 0);
      continue;
    }
    best = Math.max(best, wa.fightBonus || 0);
    for (let b = a + 1; b < weapons.length; b++) {
      const wb = weapons[b];
      if ((wb.hands || 1) === 1) best = Math.max(best, (wa.fightBonus || 0) + (wb.fightBonus || 0));
    }
  }
  return best;
}

// -------------------------------------------------------------
// Decks
// -------------------------------------------------------------
export function drawItems(state: GameState, idx: number, count: number): { state: GameState; drawn: Card[] } {
  let deck = state.itemDeck;
  let discards = state.discardedItems;
  if (deck.length < count && discards.length > 0) {
    deck = [...deck, ...shuffle(discards)];
    discards = [];
  }
  const drawn = deck.slice(0, count);
  let next: GameState = { ...state, itemDeck: deck.slice(count), discardedItems: discards };
  next = patchInvestigator(next, idx, inv => ({ ...inv, items: [...inv.items, ...drawn] }));
  return { state: next, drawn };
}

export function drawSpells(state: GameState, idx: number, count: number): { state: GameState; drawn: Card[] } {
  let deck = state.spellDeck;
  let discards = state.discardedSpells;
  if (deck.length < count && discards.length > 0) {
    deck = [...deck, ...shuffle(discards)];
    discards = [];
  }
  const drawn = deck.slice(0, count);
  let next: GameState = { ...state, spellDeck: deck.slice(count), discardedSpells: discards };
  next = patchInvestigator(next, idx, inv => ({ ...inv, spells: [...inv.spells, ...drawn] }));
  return { state: next, drawn };
}

export function discardRandomCard(
  state: GameState,
  idx: number,
  kind: 'item' | 'spell'
): { state: GameState; lost?: Card } {
  const inv = state.investigators[idx];
  if (!inv) return { state };
  const pile = kind === 'item' ? inv.items : inv.spells;
  if (pile.length === 0) return { state };
  const lost = pile[Math.floor(Math.random() * pile.length)];
  let next = patchInvestigator(state, idx, i =>
    kind === 'item'
      ? { ...i, items: i.items.filter(c => c.id !== lost.id) }
      : { ...i, spells: i.spells.filter(c => c.id !== lost.id) }
  );
  next =
    kind === 'item'
      ? { ...next, discardedItems: [...next.discardedItems, lost] }
      : { ...next, discardedSpells: [...next.discardedSpells, lost] };
  return { state: next, lost };
}

// -------------------------------------------------------------
// Monsters & gates
// -------------------------------------------------------------
export function spawnMonsterAtNode(state: GameState, nodeId: string): { state: GameState; monster?: Monster } {
  if (state.monsterCup.length === 0) {
    return { state: addLog(state, 'The monster cup is empty — no further horrors can emerge.', 'mythos') };
  }
  const cup = [...state.monsterCup];
  const drawn = cup.pop()!;
  const monster: Monster = { ...drawn, currentNodeId: nodeId, prevNodeId: undefined };
  return {
    state: { ...state, monsterCup: cup, activeMonsters: [...state.activeMonsters, monster] },
    monster
  };
}

export function spawnMonsterAtLocation(state: GameState, locId: string): { state: GameState; monster?: Monster } {
  const nodeId = getNodeForLocation(locId);
  if (!nodeId) return { state };
  const res = spawnMonsterAtNode(state, nodeId);
  if (res.monster) {
    res.state = addLog(
      res.state,
      `${res.monster.name} (SP ${res.monster.strength}) appears at ${LOCATIONS_DATA[locId]?.name || locId}!`,
      'mythos'
    );
  }
  return res;
}

/** Opens a gate at a location (doom +1) and brings a monster through. If a gate is already open there, only a monster appears. */
export function openGateAt(state: GameState, locId: string): GameState {
  const loc = LOCATIONS_DATA[locId];
  if (!loc) return state;

  if (state.openGates.some(g => g.locationId === locId)) {
    const next = addLog(state, `The gate at ${loc.name} pulses — another horror slips through!`, 'mythos');
    return spawnMonsterAtLocation(next, locId).state;
  }

  const world = WORLD_KEYS[Math.floor(Math.random() * WORLD_KEYS.length)];
  const gate: Gate = { id: makeId('gate'), locationId: locId, otherWorldId: world, strength: 5 };
  let next: GameState = {
    ...state,
    openGates: [...state.openGates, gate],
    doomTrack: Math.min(state.maxDoom, state.doomTrack + 1)
  };
  next = addLog(next, `A gate tears open at ${loc.name}, leading to ${OTHER_WORLDS[world].name}! Doom rises to ${next.doomTrack}.`, 'mythos');
  return spawnMonsterAtLocation(next, locId).state;
}

export function removeGate(state: GameState, gateId: string, idx: number, sealed: boolean): GameState {
  const gate = state.openGates.find(g => g.id === gateId);
  if (!gate) return state;
  let next: GameState = { ...state, openGates: state.openGates.filter(g => g.id !== gateId) };
  next = patchInvestigator(next, idx, inv => ({
    ...inv,
    trophies: { ...inv.trophies, gates: [...inv.trophies.gates, { ...gate, isSealedWithElderSign: sealed }] }
  }));
  if (sealed) next = { ...next, doomTrack: Math.max(1, next.doomTrack - 1) };
  return next;
}

/** Investigator loses all strength or sanity: sent to hospital / sanitarium. */
export function knockOut(state: GameState, idx: number, cause: 'strength' | 'sanity'): GameState {
  const inv = state.investigators[idx];
  if (!inv) return state;
  const toHospital = cause === 'strength';
  const nodeId = toHospital ? 'LOC_HOSPITAL' : 'LOC_SANITARIUM';
  let next = patchInvestigator(state, idx, i => ({
    ...i,
    locationNodeId: nodeId,
    otherWorldState: undefined,
    strength: toHospital ? 1 : Math.max(1, i.strength),
    sanity: toHospital ? Math.max(1, i.sanity) : 1,
    isInHospital: toHospital,
    isInSanitarium: !toHospital
  }));
  const res = discardRandomCard(next, idx, toHospital ? 'item' : 'spell');
  next = res.state;
  next = addLog(
    next,
    `${inv.name} ${toHospital ? 'collapses and is carried to St. Mary\'s Hospital' : 'goes mad and is committed to Arkham Sanitarium'}${
      res.lost ? ` (lost ${res.lost.name})` : ''
    }.`,
    'combat'
  );
  return next;
}

// -------------------------------------------------------------
// Setup
// -------------------------------------------------------------
export function createInvestigator(
  name: string,
  color: InvestigatorColor,
  startingStrength: number = 5,
  _startingSanity: number = 5,
  itemDeck: Card[],
  spellDeck: Card[],
  skillDeck: Card[]
): { investigator: Investigator; remainingItems: Card[]; remainingSpells: Card[]; remainingSkills: Card[] } {
  // Clamp stats to 3-7 and ensure sum is 10
  const str = Math.max(3, Math.min(7, startingStrength));
  const san = Math.max(3, Math.min(7, 10 - str));

  const investigator: Investigator = {
    id: makeId('inv'),
    name,
    color,
    maxStrength: str,
    strength: str,
    maxSanity: san,
    sanity: san,
    money: 13, // 1987 rule: deal $13 from the bank
    hasRetainer: false,
    locationNodeId: 'LOC_TRAIN_STATION', // Rule: investigators start at the Train Station
    items: itemDeck.slice(0, 3),
    spells: spellDeck.slice(0, 1),
    skills: skillDeck.slice(0, 1),
    hasCharityCard: true,
    charityRepaid: true,
    trophies: { monsters: [], gates: [] },
    stats: { fightSkill: 3, sneakSkill: 3, knowledgeSkill: 3, fastTalkSkill: 3 }
  };

  return {
    investigator,
    remainingItems: itemDeck.slice(3),
    remainingSpells: spellDeck.slice(1),
    remainingSkills: skillDeck.slice(1)
  };
}

export function initializeGame(
  playerConfigs: { name: string; color: InvestigatorColor; strength?: number; sanity?: number }[] = [
    { name: 'Prof. Armitage', color: 'blue', strength: 4, sanity: 6 },
    { name: 'Harvey Walters', color: 'green', strength: 5, sanity: 5 }
  ],
  isSoloMode: boolean = true
): GameState {
  let itemDeck = shuffle(INITIAL_ITEMS);
  let spellDeck = shuffle(INITIAL_SPELLS);
  let skillDeck = shuffle(INITIAL_SKILLS);

  const investigators: Investigator[] = [];
  for (const config of playerConfigs) {
    const res = createInvestigator(
      config.name,
      config.color,
      config.strength || 5,
      config.sanity || 5,
      itemDeck,
      spellDeck,
      skillDeck
    );
    investigators.push(res.investigator);
    itemDeck = res.remainingItems;
    spellDeck = res.remainingSpells;
    skillDeck = res.remainingSkills;
  }

  const monsterCup: Monster[] = shuffle(
    INITIAL_MONSTERS.map(m => ({ ...m, id: makeId('mon'), currentNodeId: '' }))
  );

  // Setup step 7: roll on the Gate Appearance table, open a gate and place three monsters there
  const initialGateRoll = roll2D6();
  const gateLocInfo = GATE_APPEARANCE_TABLE[initialGateRoll.sum] || GATE_APPEARANCE_TABLE[7];
  const initialWorld = WORLD_KEYS[Math.floor(Math.random() * WORLD_KEYS.length)];
  const initialGate: Gate = {
    id: makeId('gate'),
    locationId: gateLocInfo.locationId,
    otherWorldId: initialWorld,
    strength: 5
  };

  const activeMonsters: Monster[] = [];
  const locationEntryNode = getNodeForLocation(gateLocInfo.locationId) || 'LOC_TRAIN_STATION';
  for (let i = 0; i < 3 && monsterCup.length > 0; i++) {
    const m = monsterCup.pop()!;
    activeMonsters.push({ ...m, currentNodeId: locationEntryNode });
  }

  return {
    isSoloMode,
    turnNumber: 1,
    doomTrack: 1,
    maxDoom: 14,
    investigators,
    activeInvestigatorIndex: 0,
    currentPhase: 'INVESTIGATOR_START',
    subPhaseStep: 1,
    movesRemaining: 0,
    hasRolledMovement: false,
    hasTakenActionThisTurn: false,
    turnLost: false,
    evadedMonsterIds: [],
    usedCardIds: [],
    openGates: [initialGate],
    activeMonsters,
    monsterCup,
    itemDeck,
    spellDeck,
    skillDeck,
    discardedItems: [],
    discardedSpells: [],
    log: [
      { id: makeId('log'), timestamp: '1926', type: 'system', text: 'The year is 1926. A sinister past grips Arkham, Massachusetts.' },
      {
        id: makeId('log'),
        timestamp: 'Setup',
        type: 'mythos',
        text: `A dimensional gate tore open at ${gateLocInfo.locationName} connecting to ${OTHER_WORLDS[initialWorld].name}! Three horrors emerged.`
      },
      {
        id: makeId('log'),
        timestamp: 'Setup',
        type: 'action',
        text: `The investigators arrive at the Train Station. ${investigators[0]?.name} moves first.`
      }
    ],
    chat: []
  };
}

// -------------------------------------------------------------
// Turn flow
// -------------------------------------------------------------
/** Prepares the start of an investigator's turn: income, lost turns, Other World progression. */
export function beginInvestigatorTurn(state: GameState, idx: number): GameState {
  let next: GameState = {
    ...state,
    activeInvestigatorIndex: idx,
    currentPhase: 'INVESTIGATOR_START',
    hasRolledMovement: false,
    movesRemaining: 0,
    hasTakenActionThisTurn: false,
    turnLost: false,
    evadedMonsterIds: [],
    usedCardIds: []
  };
  const inv = next.investigators[idx];
  if (!inv) return next;

  next = addLog(next, `— ${inv.name}'s turn —`, 'system');

  if (inv.hasRetainer) {
    next = patchInvestigator(next, idx, i => ({ ...i, money: i.money + 2 }));
    next = addLog(next, `${inv.name} collects $2 from their Retainer.`);
  }

  // Clear "just admitted" markers from last round
  next = patchInvestigator(next, idx, i => ({ ...i, isInHospital: false, isInSanitarium: false }));

  if ((inv.skipTurns || 0) > 0) {
    next = patchInvestigator(next, idx, i => ({ ...i, skipTurns: (i.skipTurns || 1) - 1, isInJail: (i.skipTurns || 1) - 1 > 0 && i.isInJail }));
    next = addLog(next, `${inv.name} loses this turn.`);
    return { ...next, turnLost: true, hasTakenActionThisTurn: true, currentPhase: 'INVESTIGATOR_ENCOUNTER' };
  }

  if (inv.otherWorldState) {
    const ow = inv.otherWorldState;
    const world = OTHER_WORLDS[ow.worldId as OtherWorldId];
    if (ow.stayInBox) {
      next = patchInvestigator(next, idx, i => ({ ...i, otherWorldState: { ...ow, stayInBox: false } }));
      next = addLog(next, `${inv.name} is still lost in Box ${ow.box} of ${world?.name}.`);
    } else if (ow.box === 2) {
      next = patchInvestigator(next, idx, i => ({ ...i, otherWorldState: { ...ow, box: 1, turnsRemaining: 1 } }));
      next = addLog(next, `${inv.name} advances to Box 1 in ${world?.name}.`);
    } else {
      const gate = next.openGates.find(g => g.locationId === ow.gateLocationId) ||
        next.openGates.find(g => g.otherWorldId === ow.worldId);
      const locId = gate?.locationId || ow.gateLocationId;
      const nodeId = (locId && getNodeForLocation(locId)) || 'LOC_TRAIN_STATION';
      next = patchInvestigator(next, idx, i => ({ ...i, otherWorldState: undefined, locationNodeId: nodeId }));
      next = addLog(next, `${inv.name} returns from ${world?.name} through the gate at ${getNodeDisplayLabel(nodeId)}!`);
    }
  }
  return next;
}

// -------------------------------------------------------------
// Movement
// -------------------------------------------------------------
export function getAvailableMoveNodes(
  currentNodeId: string,
  movesRemaining: number,
  activeMonsters: Monster[]
): string[] {
  const monsterNodes = activeMonsters.map(m => m.currentNodeId);
  return getReachableNodes(currentNodeId, movesRemaining, monsterNodes);
}

function turnAngle(prevId: string | undefined, curId: string, nextId: string): number {
  const prev = prevId ? BOARD_NODES[prevId] : undefined;
  const cur = BOARD_NODES[curId];
  const nxt = BOARD_NODES[nextId];
  if (!prev || !cur || !nxt) return 0;
  const hx = cur.x - prev.x;
  const hy = cur.y - prev.y;
  const cx = nxt.x - cur.x;
  const cy = nxt.y - cur.y;
  // Screen coordinates (y down): positive cross product = clockwise = right turn
  return Math.atan2(hx * cy - hy * cx, hx * cx + hy * cy);
}

function chooseNextStep(m: Monster, curId: string, prevId: string | undefined): string | null {
  const all = getNeighbors(curId);
  if (all.length === 0) return null;
  const options = all.length > 1 && prevId ? all.filter(n => n !== prevId) : all;
  if (options.length === 1 || !prevId || m.handedness === 'none' || !m.handedness) {
    return options[Math.floor(Math.random() * options.length)];
  }
  const sorted = [...options].sort((a, b) => turnAngle(prevId, curId, a) - turnAngle(prevId, curId, b));
  return m.handedness === 'R' ? sorted[sorted.length - 1] : sorted[0];
}

/** Mythos: every monster moves its speed (flyers swoop toward the nearest investigator). */
export function executeMonsterMovement(
  monsters: Monster[],
  investigators: Investigator[]
): { updatedMonsters: Monster[]; logs: string[] } {
  const logs: string[] = [];
  const targets = investigators.filter(i => !i.otherWorldState && BOARD_NODES[i.locationNodeId]);
  const occupied = new Set(targets.map(t => t.locationNodeId));

  const updatedMonsters = monsters.map(m => {
    if (m.isStationary || m.speed <= 0 || !BOARD_NODES[m.currentNodeId]) return m;
    if (occupied.has(m.currentNodeId)) return m; // already engaging an investigator

    if (m.isFlyer && targets.length > 0) {
      let best: string[] | null = null;
      for (const t of targets) {
        const path = findShortestPath(m.currentNodeId, t.locationNodeId, 99, []);
        if (path && (!best || path.length < best.length)) best = path;
      }
      if (best && best.length > 1) {
        const steps = Math.min(m.flyerSpeed || m.speed, best.length - 1);
        const dest = best[steps];
        const prev = best[steps - 1];
        logs.push(`${m.name} swoops ${steps} space${steps > 1 ? 's' : ''} to ${getNodeDisplayLabel(dest)}.`);
        return { ...m, currentNodeId: dest, prevNodeId: prev };
      }
    }

    let cur = m.currentNodeId;
    let prev = m.prevNodeId;
    let moved = 0;
    for (let s = 0; s < m.speed; s++) {
      const step = chooseNextStep(m, cur, prev);
      if (!step) break;
      prev = cur;
      cur = step;
      moved++;
      if (occupied.has(cur)) break; // stops when it reaches an investigator
    }
    if (moved === 0) return m;
    logs.push(`${m.name} prowls to ${getNodeDisplayLabel(cur)}.`);
    return { ...m, currentNodeId: cur, prevNodeId: prev };
  });

  return { updatedMonsters, logs };
}
