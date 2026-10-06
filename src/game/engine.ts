import {
  Card,
  GameState,
  Investigator,
  InvestigatorColor,
  Monster,
  TurnPhase,
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
  OTHER_WORLDS,
  STREET_NODES
} from '../data/rules1987';

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

export function createInvestigator(
  name: string,
  color: InvestigatorColor,
  startingStrength: number = 5,
  startingSanity: number = 5,
  itemDeck: Card[],
  spellDeck: Card[],
  skillDeck: Card[]
): { investigator: Investigator; remainingItems: Card[]; remainingSpells: Card[]; remainingSkills: Card[] } {
  // Clamp stats to 3-7 and ensure sum is 10
  const str = Math.max(3, Math.min(7, startingStrength));
  const san = Math.max(3, Math.min(7, 10 - str));

  const items = itemDeck.slice(0, 3);
  const remainingItems = itemDeck.slice(3);

  const spells = spellDeck.slice(0, 1);
  const remainingSpells = spellDeck.slice(1);

  const skills = skillDeck.slice(0, 1);
  const remainingSkills = skillDeck.slice(1);

  const investigator: Investigator = {
    id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    color,
    maxStrength: str,
    strength: str,
    maxSanity: san,
    sanity: san,
    money: 13, // 1987 rule: deal $13 from the bank
    hasRetainer: false,
    locationNodeId: 'node_train_station', // Rule: Place investigator tokens in play at the Train Station
    items,
    spells,
    skills,
    hasCharityCard: true,
    charityRepaid: true,
    trophies: {
      monsters: [],
      gates: []
    },
    stats: {
      fightSkill: 3,
      sneakSkill: 3,
      knowledgeSkill: 3,
      fastTalkSkill: 3
    }
  };

  return { investigator, remainingItems, remainingSpells, remainingSkills };
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

  // Create monster cup
  const monsterCup: Monster[] = shuffle(
    INITIAL_MONSTERS.map((m, idx) => ({
      ...m,
      id: `mon_${idx}_${Date.now()}`,
      currentNodeId: ''
    }))
  );

  // Setup Step 7: Select top gate card / roll on Gate Appearance table
  const initialGateRoll = roll2D6();
  const gateLocInfo = GATE_APPEARANCE_TABLE[initialGateRoll.sum] || GATE_APPEARANCE_TABLE[7];
  
  const worldKeys: OtherWorldId[] = [
    'abyss',
    'another_dimension',
    'city_of_great_race',
    'earths_dreamlands',
    'great_hall_of_celeano',
    'plateau_of_leng',
    'rlyeh',
    'yuggoth'
  ];
  const initialWorld = worldKeys[Math.floor(Math.random() * worldKeys.length)];

  const initialGate: Gate = {
    id: `gate_${Date.now()}`,
    locationId: gateLocInfo.locationId,
    otherWorldId: initialWorld,
    strength: 5
  };

  // Rule Step 7: Randomly select three monsters and put them face up on the gated location
  const activeMonsters: Monster[] = [];
  const locationEntryNode = LOCATIONS_DATA[gateLocInfo.locationId]?.pointerNodeId || 'node_train_station';

  for (let i = 0; i < 3 && monsterCup.length > 0; i++) {
    const m = monsterCup.pop()!;
    m.currentNodeId = locationEntryNode;
    activeMonsters.push(m);
  }

  return {
    isSoloMode,
    turnNumber: 1,
    doomTrack: 1, // Rule Step 7: Put Doom Factor counter on space 1 of the doom track
    maxDoom: 14,
    investigators,
    activeInvestigatorIndex: 0,
    currentPhase: 'INVESTIGATOR_START',
    subPhaseStep: 1,
    movesRemaining: 0,
    hasRolledMovement: false,
    hasTakenActionThisTurn: false,
    openGates: [initialGate],
    activeMonsters,
    monsterCup,
    itemDeck,
    spellDeck,
    skillDeck,
    discardedItems: [],
    discardedSpells: [],
    log: [
      {
        id: `log_${Date.now()}_1`,
        timestamp: '1926 Arkham',
        type: 'system',
        text: 'The year is 1926. A sinister past grips Arkham, Massachusetts.'
      },
      {
        id: `log_${Date.now()}_2`,
        timestamp: 'Setup',
        type: 'mythos',
        text: `A dimensional gate tore open at ${gateLocInfo.locationName} connecting to ${OTHER_WORLDS[initialWorld].name}! Three horrors emerged.`
      },
      {
        id: `log_${Date.now()}_3`,
        timestamp: 'Setup',
        type: 'action',
        text: `${investigators[0].name} arrives at the Train Station to commence the investigation.`
      }
    ],
    chat: []
  };
}

// Graph movement validator
export function getAvailableMoveNodes(
  currentNodeId: string,
  movesRemaining: number,
  activeMonsters: Monster[]
): string[] {
  if (movesRemaining <= 0) return [currentNodeId];

  const reachable = new Set<string>();
  const queue: { nodeId: string; remaining: number }[] = [{ nodeId: currentNodeId, remaining: movesRemaining }];
  const visited = new Map<string, number>();

  while (queue.length > 0) {
    const { nodeId, remaining } = queue.shift()!;
    reachable.add(nodeId);

    if (remaining <= 0) continue;

    // Check if monster in this space: if moving through a space with a monster, you must stop!
    const hasMonster = activeMonsters.some(m => m.currentNodeId === nodeId && nodeId !== currentNodeId);
    if (hasMonster) {
      // Must stop here, cannot proceed further
      continue;
    }

    const node = STREET_NODES[nodeId];
    if (!node) continue;

    for (const neighborId of node.connectedTo) {
      const nextRemaining = remaining - 1;
      const prevBest = visited.get(neighborId);
      if (prevBest === undefined || prevBest < nextRemaining) {
        visited.set(neighborId, nextRemaining);
        queue.push({ nodeId: neighborId, remaining: nextRemaining });
      }
    }
  }

  return Array.from(reachable);
}

// Mythos monster movement algorithm adhering to 1987 rules
export function executeMonsterMovement(
  monsters: Monster[],
  investigators: Investigator[]
): { updatedMonsters: Monster[]; logs: string[] } {
  const logs: string[] = [];
  const updatedMonsters = monsters.map(m => {
    // 1. Stationary monsters do not move
    if (m.isStationary || m.speed <= 0) {
      return m;
    }

    let currentNode = STREET_NODES[m.currentNodeId];
    if (!currentNode) {
      // Monster might be in a location, move to pointer
      return m;
    }

    // 2. Flyer monsters move towards nearest investigator
    if (m.isFlyer) {
      const target = findNearestInvestigator(m.currentNodeId, investigators);
      if (target) {
        const nextStep = getStepTowards(m.currentNodeId, target.locationNodeId);
        if (nextStep) {
          logs.push(`${m.name} flew along the streets toward ${target.name}!`);
          return { ...m, currentNodeId: nextStep };
        }
      }
    }

    // 3. Regular monsters move based on connected paths and handedness
    const neighbors = currentNode.connectedTo;
    if (neighbors.length === 0) return m;

    let chosenNode = neighbors[0];
    if (neighbors.length > 1) {
      if (m.handedness === 'R') {
        chosenNode = neighbors[neighbors.length - 1]; // Rightmost
      } else if (m.handedness === 'L') {
        chosenNode = neighbors[0]; // Leftmost
      } else {
        chosenNode = neighbors[Math.floor(Math.random() * neighbors.length)];
      }
    }

    logs.push(`${m.name} prowled from ${currentNode.name} to ${STREET_NODES[chosenNode]?.name || chosenNode}.`);
    return { ...m, currentNodeId: chosenNode };
  });

  return { updatedMonsters, logs };
}

function findNearestInvestigator(startNodeId: string, investigators: Investigator[]): Investigator | null {
  if (investigators.length === 0) return null;
  // Simple distance comparison based on coordinates
  const startNode = STREET_NODES[startNodeId];
  if (!startNode) return investigators[0];

  let nearest = investigators[0];
  let minDistance = Infinity;

  for (const inv of investigators) {
    const invNode = STREET_NODES[inv.locationNodeId] || LOCATIONS_DATA[inv.locationNodeId];
    if (!invNode) continue;
    const dist = Math.hypot(startNode.x - invNode.x, startNode.y - invNode.y);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = inv;
    }
  }

  return nearest;
}

function getStepTowards(startNodeId: string, targetNodeId: string): string | null {
  if (startNodeId === targetNodeId) return null;
  const start = STREET_NODES[startNodeId];
  const target = STREET_NODES[targetNodeId];
  if (!start || !target) return null;

  let bestNeighbor: string | null = null;
  let bestDist = Infinity;

  for (const neighborId of start.connectedTo) {
    const neighbor = STREET_NODES[neighborId];
    if (!neighbor) continue;
    const dist = Math.hypot(neighbor.x - target.x, neighbor.y - target.y);
    if (dist < bestDist) {
      bestDist = dist;
      bestNeighbor = neighborId;
    }
  }

  return bestNeighbor;
}
