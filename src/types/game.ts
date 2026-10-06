export type InvestigatorColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'black' | 'silver';

export interface Card {
  id: string;
  name: string;
  type: 'item' | 'spell' | 'skill' | 'charity' | 'retainer';
  description: string;
  price?: number;
  hands?: 1 | 2; // 1H or 2H for weapons
  fightBonus?: number;
  magicBonus?: number;
  isMagical?: boolean;
  isGun?: boolean;
  sanityCost?: number;
  castDifficulty?: number; // Knowledge roll requirement
  specialEffect?: string;
}

export interface Monster {
  id: string;
  name: string;
  species: string;
  strength: number; // SP
  sanityCheck: { passLoss: number; failLoss: number }; // SAN e.g. 0/1, 1/3, 2/6
  speed: number;
  direction?: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  handedness?: 'L' | 'R' | 'none'; // Intersection turn direction
  isFlyer?: boolean;
  flyerSpeed?: number; // e.g. 4 or 6
  isBlocker?: boolean;
  isStationary?: boolean;
  isPower?: boolean;
  isMagical?: boolean;
  specialRules?: string[]; // e.g. "Unharmed By Guns", "Only Magic Harms It", "Hound of Tindalos"
  otherWorldColor?: string; // color tint matching an Other World
  currentNodeId: string; // street node or location ID
}

export interface Gate {
  id: string;
  locationId: string;
  otherWorldId: string;
  strength: number;
  isSealedWithElderSign?: boolean;
}

export interface Investigator {
  id: string;
  name: string;
  color: InvestigatorColor;
  isAI?: boolean;
  isReady?: boolean;
  maxStrength: number;
  strength: number;
  maxSanity: number;
  sanity: number;
  money: number;
  hasRetainer: boolean;
  hasAutomobile?: boolean;
  locationNodeId: string; // Current location or street node
  previousNodeId?: string;
  otherWorldState?: {
    worldId: string;
    box: 1 | 2; // Box 2 (first turn entered) -> Box 1 (second turn) -> Return to Arkham
    turnsRemaining: number;
  };
  isInHospital?: boolean;
  isInSanitarium?: boolean;
  isInJail?: boolean;
  lostNextTurn?: boolean;
  items: Card[];
  spells: Card[];
  skills: Card[];
  hasCharityCard: boolean;
  charityRepaid: boolean;
  trophies: {
    monsters: Monster[];
    gates: Gate[];
  };
  stats: {
    fightSkill: number;
    sneakSkill: number;
    knowledgeSkill: number;
    fastTalkSkill: number;
  };
}

export type OtherWorldId =
  | 'abyss'
  | 'another_dimension'
  | 'city_of_great_race'
  | 'earths_dreamlands'
  | 'great_hall_of_celeano'
  | 'plateau_of_leng'
  | 'rlyeh'
  | 'yuggoth';

export interface OtherWorld {
  id: OtherWorldId;
  name: string;
  color: string;
  description: string;
  flavor: string;
  table: Record<number, string>;
}

export interface LocationData {
  id: string;
  name: string;
  neighborhood?: string;
  pointerNodeId: string; // The street node from which this location is entered
  x: number;
  y: number;
  description: string;
  hasGate?: boolean;
  gate?: Gate;
  events: Record<number, LocationEvent>;
}

export interface LocationEvent {
  roll: number;
  text: string;
  type: 'item' | 'spell' | 'money' | 'stat' | 'monster' | 'gate' | 'teleport' | 'choice' | 'jail' | 'retainer' | 'heal' | 'special';
  reward?: {
    money?: number;
    strength?: number;
    sanity?: number;
    itemsCount?: number;
    spellsCount?: number;
    retainer?: boolean;
    teleportTo?: string;
    monsterSpawn?: boolean;
    gateSpawn?: boolean;
  };
}

export interface StreetNode {
  id: string;
  name: string;
  x: number;
  y: number;
  connectedTo: string[]; // Neighbor node IDs
  isTaxiStand?: boolean;
  isIntersection?: boolean;
  leadsToLocation?: string; // Location ID if this is an entrance pointer
}

export type TurnPhase =
  | 'INVESTIGATOR_START'
  | 'INVESTIGATOR_MOVE'
  | 'INVESTIGATOR_ENCOUNTER'
  | 'INVESTIGATOR_COMBAT'
  | 'MYTHOS_GATES'
  | 'MYTHOS_MONSTERS_MOVE'
  | 'MYTHOS_MONSTERS_ATTACK'
  | 'ROUND_COMPLETE'
  | 'GAME_OVER';

export interface LogMessage {
  id: string;
  timestamp: string;
  text: string;
  type: 'action' | 'combat' | 'mythos' | 'event' | 'system';
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderColor: InvestigatorColor;
  text: string;
  timestamp: string;
}

export interface GameState {
  roomCode?: string;
  isSoloMode: boolean;
  turnNumber: number;
  doomTrack: number; // 1 to 14 (14 = DOOM OF ARKHAM)
  maxDoom: number;
  investigators: Investigator[];
  activeInvestigatorIndex: number;
  currentPhase: TurnPhase;
  subPhaseStep: number;
  movesRemaining: number;
  hasRolledMovement: boolean;
  hasTakenActionThisTurn: boolean;
  openGates: Gate[];
  activeMonsters: Monster[];
  monsterCup: Monster[];
  itemDeck: Card[];
  spellDeck: Card[];
  skillDeck: Card[];
  discardedItems: Card[];
  discardedSpells: Card[];
  log: LogMessage[];
  chat: ChatMessage[];
  lastDiceRoll?: {
    type: string;
    dice: number[];
    sum: number;
    description: string;
  };
  pendingEncounter?: {
    locationId?: string;
    otherWorldId?: string;
    roll: number;
    eventText: string;
    choices?: { label: string; action: string }[];
  };
  pendingCombat?: {
    investigatorId: string;
    monster: Monster;
    stage: 'sanity' | 'sneak' | 'fight' | 'result';
    sanityPassed?: boolean;
    sneakPassed?: boolean;
    selectedWeaponIds: string[];
    selectedSpellIds: string[];
    investigatorRoll?: number;
    monsterDamage?: number;
    outcome?: 'win' | 'flee' | 'defeat';
  };
  winner?: {
    isVictory: boolean;
    reason: string;
    firstCitizen?: string;
    honorRoll: { name: string; gatesClosed: number; monsterTrophies: number }[];
  };
}
