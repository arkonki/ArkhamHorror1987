import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, GameState, Monster, OtherWorldId, LocationEvent } from './types/game';
import {
  initializeGame,
  roll2D6,
  rollD6,
  getAvailableMoveNodes,
  executeMonsterMovement,
  addLog,
  patchInvestigator,
  getInvestigatorIndex,
  beginInvestigatorTurn,
  openGateAt,
  spawnMonsterAtLocation,
  removeGate,
  knockOut
} from './game/engine';
import { applyOutcome, buildEncounterOptions, EncounterOption, Outcome } from './game/encounters';
import { LOCATIONS_DATA, OTHER_WORLDS, GATE_APPEARANCE_TABLE } from './data/rules1987';
import { findShortestPath, getLocationIdForNode, getNodeDisplayLabel } from './data/boardGraph';
import { GameBoard } from './components/GameBoard';
import { InvestigatorSheet } from './components/InvestigatorSheet';
import { ActionControls } from './components/ActionControls';
import { DiceRoller } from './components/DiceRoller';
import { CombatModal } from './components/CombatModal';
import { EncounterModal } from './components/EncounterModal';
import { GateModal } from './components/GateModal';
import { TaxiModal } from './components/TaxiModal';
import { OtherWorldModal } from './components/OtherWorldModal';
import { NewGameModal } from './components/NewGameModal';
import { RulesModal } from './components/RulesModal';
import { GameOverModal } from './components/GameOverModal';
import { LogPanel } from './components/LogPanel';
import { Skull, BookOpen, RotateCcw, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { sound } from './utils/audio';

type CombatContext = 'turn' | 'mythos' | 'otherworld';

interface CombatState {
  monster: Monster;
  investigatorId: string;
  context: CombatContext;
  resumeMoves?: number; // moves left when an ambush interrupted movement
}

interface EncounterState {
  uid: number;
  kind: 'location' | 'otherworld';
  investigatorId: string;
  locationId?: string;
  worldId?: OtherWorldId;
  endsTurn?: boolean; // Other World exploration ends the investigator's turn
  title: string;
  subtitle?: string;
  roll: number;
  event: LocationEvent;
  options: EncounterOption[];
}

type TaxiMode = 'paid' | 'car' | 'free';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => initializeGame());
  // The ref always holds the latest committed state, so chained handlers / timers never read stale data
  const stateRef = useRef<GameState>(gameState);
  const commit = useCallback((next: GameState) => {
    stateRef.current = next;
    setGameState(next);
  }, []);
  const cur = () => stateRef.current;

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [selectedInvestigatorIdx, setSelectedInvestigatorIdx] = useState<number>(0);
  const [movingPawn, setMovingPawn] = useState<{ investigatorId: string; currentNodeId: string } | null>(null);
  const moveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isNewGameOpen, setIsNewGameOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [taxiMode, setTaxiMode] = useState<TaxiMode | null>(null);
  const [dice, setDice] = useState<{ open: boolean; dice: [number, number]; title: string; description: string }>({
    open: false,
    dice: [1, 1],
    title: '',
    description: ''
  });
  const [inspectWorldId, setInspectWorldId] = useState<OtherWorldId | null>(null);
  const [gateModalId, setGateModalId] = useState<string | null>(null);
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [encounter, setEncounter] = useState<EncounterState | null>(null);
  const mythosQueue = useRef<{ investigatorId: string; monsterId: string }[]>([]);
  const encounterSeq = useRef(0);

  const activeIdx = gameState.activeInvestigatorIndex;
  const activeInvestigator = gameState.investigators[activeIdx];
  const isMoving = movingPawn !== null;

  useEffect(() => () => {
    if (moveTimer.current) clearInterval(moveTimer.current);
  }, []);

  // Keep the character sheet on whoever is acting
  useEffect(() => {
    setSelectedInvestigatorIdx(activeIdx);
  }, [activeIdx, gameState.turnNumber]);

  // Portal sound whenever a new gate opens
  const prevGateCount = useRef(gameState.openGates.length);
  useEffect(() => {
    if (gameState.openGates.length > prevGateCount.current) sound.playEldritchPortal();
    prevGateCount.current = gameState.openGates.length;
  }, [gameState.openGates.length]);

  // -------------------------------------------------------------
  // Win / loss
  // -------------------------------------------------------------
  useEffect(() => {
    const s = cur();
    if (s.currentPhase === 'GAME_OVER') return;
    const honorRoll = s.investigators.map(inv => ({
      name: inv.name,
      gatesClosed: inv.trophies.gates.length,
      monsterTrophies: inv.trophies.monsters.length
    }));
    const maxGatesAllowed = s.investigators.length <= 3 ? 8 : 7;

    if (s.turnNumber >= 2 && s.openGates.length === 0) {
      const best = [...s.investigators].sort(
        (a, b) => b.trophies.gates.length - a.trophies.gates.length || b.trophies.monsters.length - a.trophies.monsters.length
      )[0];
      commit({
        ...s,
        currentPhase: 'GAME_OVER',
        winner: {
          isVictory: true,
          reason: 'All dimensional gates have been closed! Arkham is saved from the cosmic horrors!',
          firstCitizen: best?.name,
          honorRoll
        }
      });
    } else if (s.doomTrack >= s.maxDoom) {
      commit({
        ...s,
        currentPhase: 'GAME_OVER',
        winner: {
          isVictory: false,
          reason: 'The Doom Factor reached the Doom of Arkham! The walls between worlds collapsed and the Ancient Ones devoured the earth.',
          honorRoll
        }
      });
    } else if (s.openGates.length >= maxGatesAllowed) {
      commit({
        ...s,
        currentPhase: 'GAME_OVER',
        winner: {
          isVictory: false,
          reason: `Too many gates (${s.openGates.length}) stand open across Arkham at once! The town was swallowed whole.`,
          honorRoll
        }
      });
    }
  }, [gameState.openGates.length, gameState.doomTrack, gameState.turnNumber, commit]);

  // -------------------------------------------------------------
  // Movement
  // -------------------------------------------------------------
  const reachableNodes = useMemo(() => {
    if (gameState.currentPhase !== 'INVESTIGATOR_MOVE' || gameState.movesRemaining <= 0 || !activeInvestigator || isMoving) {
      return [];
    }
    return getAvailableMoveNodes(activeInvestigator.locationNodeId, gameState.movesRemaining, gameState.activeMonsters).filter(
      n => n !== activeInvestigator.locationNodeId
    );
  }, [gameState.currentPhase, gameState.movesRemaining, gameState.activeMonsters, activeInvestigator?.locationNodeId, isMoving]);

  const handleRollMovement = () => {
    const s = cur();
    const inv = s.investigators[s.activeInvestigatorIndex];
    if (!inv || s.currentPhase !== 'INVESTIGATOR_START') return;
    const { d1, d2, sum } = roll2D6();
    const motorcycle = inv.items.some(i => i.specialEffect === 'motorcycle_move') ? 2 : 0;
    const bonus = inv.moveBonus || 0;
    const total = Math.max(1, sum + motorcycle + bonus);
    const extras = [motorcycle && '+2 motorcycle', bonus && `${bonus > 0 ? '+' : ''}${bonus} ${bonus > 0 ? 'bonus' : 'delay'}`]
      .filter(Boolean)
      .join(', ');

    setDice({
      open: true,
      dice: [d1, d2],
      title: 'Movement Roll',
      description: `${total} spaces to move${extras ? ` (${extras})` : ''}.`
    });

    let n = patchInvestigator(s, s.activeInvestigatorIndex, i => ({ ...i, moveBonus: 0 }));
    n = addLog(n, `${inv.name} rolled [${d1}, ${d2}]${extras ? ` ${extras}` : ''} = ${total} moves.`);
    commit({
      ...n,
      currentPhase: 'INVESTIGATOR_MOVE',
      movesRemaining: total,
      hasRolledMovement: true,
      lastDiceRoll: { type: 'Movement', dice: [d1, d2], sum: total, description: `${total} spaces` }
    });
  };

  const finishMove = (investigatorId: string, walk: string[]) => {
    const s = cur();
    const idx = getInvestigatorIndex(s, investigatorId);
    const inv = s.investigators[idx];
    if (!inv || walk.length === 0) return;
    const final = walk[walk.length - 1];
    const remaining = Math.max(0, s.movesRemaining - walk.length);
    let n = patchInvestigator(s, idx, i => ({ ...i, locationNodeId: final, previousNodeId: i.locationNodeId }));
    n = addLog(n, `${inv.name} moved ${walk.length} space${walk.length > 1 ? 's' : ''} to ${getNodeDisplayLabel(final)}.`);

    const monster = n.activeMonsters.find(m => m.currentNodeId === final);
    if (monster) {
      n = addLog(n, `Movement halted! ${inv.name} runs into ${monster.name}!`, 'combat');
      commit({ ...n, movesRemaining: 0, currentPhase: 'INVESTIGATOR_COMBAT' });
      setCombat({ monster, investigatorId, context: 'turn', resumeMoves: remaining });
      return;
    }
    commit({
      ...n,
      movesRemaining: remaining,
      currentPhase: remaining > 0 ? 'INVESTIGATOR_MOVE' : 'INVESTIGATOR_ENCOUNTER'
    });
  };

  const handleNodeClick = (targetNodeId: string) => {
    const s = cur();
    const inv = s.investigators[s.activeInvestigatorIndex];
    if (!inv || s.currentPhase !== 'INVESTIGATOR_MOVE' || isMoving) return;
    if (!reachableNodes.includes(targetNodeId)) return;

    const monsterNodes = s.activeMonsters.map(m => m.currentNodeId);
    const path = findShortestPath(inv.locationNodeId, targetNodeId, s.movesRemaining, monsterNodes);
    if (!path || path.length < 2) return;
    const steps = path.slice(1);
    const haltAt = steps.findIndex(nodeId => s.activeMonsters.some(m => m.currentNodeId === nodeId));
    const walk = haltAt >= 0 ? steps.slice(0, haltAt + 1) : steps;

    if (walk.length === 1) {
      sound.playStep();
      finishMove(inv.id, walk);
      return;
    }

    // Hop the pawn space-by-space, then commit once at the end
    let i = 0;
    setMovingPawn({ investigatorId: inv.id, currentNodeId: walk[0] });
    sound.playStep();
    moveTimer.current = setInterval(() => {
      i += 1;
      if (i < walk.length) {
        sound.playStep();
        setMovingPawn({ investigatorId: inv.id, currentNodeId: walk[i] });
        return;
      }
      if (moveTimer.current) clearInterval(moveTimer.current);
      moveTimer.current = null;
      setMovingPawn(null);
      finishMove(inv.id, walk);
    }, 140);
  };

  const handleEndMovementEarly = () => {
    const s = cur();
    const inv = s.investigators[s.activeInvestigatorIndex];
    if (!inv || isMoving) return;
    commit({
      ...addLog(s, `${inv.name} stops at ${getNodeDisplayLabel(inv.locationNodeId)}.`),
      movesRemaining: 0,
      currentPhase: 'INVESTIGATOR_ENCOUNTER'
    });
  };

  const handleWaitAction = () => {
    const s = cur();
    const inv = s.investigators[s.activeInvestigatorIndex];
    if (!inv) return;
    commit({
      ...addLog(s, `${inv.name} stays at ${getNodeDisplayLabel(inv.locationNodeId)}.`),
      hasRolledMovement: true,
      movesRemaining: 0,
      currentPhase: 'INVESTIGATOR_ENCOUNTER'
    });
  };

  const handleSelectTaxiDestination = (destNodeId: string) => {
    const mode = taxiMode;
    setTaxiMode(null);
    const s = cur();
    const idx = s.activeInvestigatorIndex;
    const inv = s.investigators[idx];
    if (!inv || !mode) return;
    if (mode === 'paid' && inv.money < 1) return;

    let n = patchInvestigator(s, idx, i => ({
      ...i,
      money: mode === 'paid' ? i.money - 1 : i.money,
      locationNodeId: destNodeId
    }));
    const how = mode === 'paid' ? 'paid $1 for a cab' : mode === 'car' ? 'drove the Automobile' : 'accepted the ride';
    n = addLog(n, `${inv.name} ${how} to ${getNodeDisplayLabel(destNodeId)}.`);
    const monster = n.activeMonsters.find(m => m.currentNodeId === destNodeId);
    n = { ...n, hasRolledMovement: true, movesRemaining: 0 };
    if (monster) {
      n = addLog(n, `Ambushed on arrival! ${inv.name} faces ${monster.name}!`, 'combat');
      commit({ ...n, currentPhase: 'INVESTIGATOR_COMBAT' });
      setCombat({ monster, investigatorId: inv.id, context: 'turn' });
      return;
    }
    commit({ ...n, currentPhase: 'INVESTIGATOR_ENCOUNTER' });
  };

  // -------------------------------------------------------------
  // Turn order
  // -------------------------------------------------------------
  const handleEndInvestigatorTurn = () => {
    const s = cur();
    if (s.currentPhase === 'GAME_OVER') return;
    const nextIdx = s.activeInvestigatorIndex + 1;
    if (nextIdx < s.investigators.length) {
      commit(beginInvestigatorTurn(s, nextIdx));
    } else {
      const n = addLog(s, 'All investigators have acted. The Mythos Phase begins!', 'mythos');
      commit({ ...n, currentPhase: 'MYTHOS_GATES', hasRolledMovement: false, movesRemaining: 0, evadedMonsterIds: [] });
    }
  };

  const completeRound = () => {
    const s = cur();
    let n = addLog({ ...s, turnNumber: s.turnNumber + 1 }, `Mythos Phase ends. Turn ${s.turnNumber + 1} begins.`, 'system');
    n = beginInvestigatorTurn(n, 0);
    commit(n);
  };

  // -------------------------------------------------------------
  // Encounters
  // -------------------------------------------------------------
  const startLocationEncounter = (locId: string) => {
    const s = cur();
    const inv = s.investigators[s.activeInvestigatorIndex];
    const loc = LOCATIONS_DATA[locId];
    if (!inv || !loc) return;
    const roll = rollD6();
    const event = loc.events[roll] || loc.events[1];
    sound.playDiceRoll();
    commit(addLog(s, `${inv.name} rolls ${roll} at ${loc.name}: "${event.text}"`, 'event'));
    setEncounter({
      uid: ++encounterSeq.current,
      kind: 'location',
      investigatorId: inv.id,
      locationId: locId,
      title: loc.name,
      subtitle: loc.description,
      roll,
      event,
      options: buildEncounterOptions(event, inv, s, { locationId: locId })
    });
  };

  const startOtherWorldEncounter = (worldId: OtherWorldId, endsTurn: boolean) => {
    const s = cur();
    const inv = s.investigators[s.activeInvestigatorIndex];
    const world = OTHER_WORLDS[worldId];
    if (!inv || !world) return;
    const roll = rollD6();
    const text = world.table[roll];
    const event: LocationEvent = { roll, text, type: 'special' };
    sound.playEldritchPortal();
    commit(addLog(s, `${inv.name} rolls ${roll} in ${world.name}: "${text}"`, 'event'));
    setEncounter({
      uid: ++encounterSeq.current,
      kind: 'otherworld',
      investigatorId: inv.id,
      worldId,
      endsTurn,
      title: world.name,
      subtitle: world.description,
      roll,
      event,
      options: buildEncounterOptions(event, inv, s, { otherWorld: true })
    });
  };

  const handleDrawEncounter = () => {
    const s = cur();
    const inv = s.investigators[s.activeInvestigatorIndex];
    if (!inv || s.hasTakenActionThisTurn) return;
    const locId = getLocationIdForNode(inv.locationNodeId);
    if (!locId) return;
    if (s.openGates.some(g => g.locationId === locId)) {
      setGateModalId(s.openGates.find(g => g.locationId === locId)!.id);
      return;
    }
    startLocationEncounter(locId);
  };

  const handleExploreOtherWorld = () => {
    const s = cur();
    const inv = s.investigators[s.activeInvestigatorIndex];
    if (!inv?.otherWorldState) return;
    if (inv.items.some(i => i.specialEffect === 'silver_key')) {
      commit({ ...addLog(s, `${inv.name}'s Silver Key guides them safely through the Other World.`), hasTakenActionThisTurn: true });
      handleEndInvestigatorTurn();
      return;
    }
    startOtherWorldEncounter(inv.otherWorldState.worldId as OtherWorldId, true);
  };

  const handleResolveEncounter = (outcome: Outcome | undefined, cost: number, summary: string) => {
    const enc = encounter;
    setEncounter(null);
    if (!enc) return;
    const s = cur();
    const idx = getInvestigatorIndex(s, enc.investigatorId);
    const inv = s.investigators[idx];
    if (!inv) return;

    const res = applyOutcome(addLog(s, `${inv.name}: ${summary}.`, 'event'), idx, outcome, {
      locationId: enc.locationId,
      otherWorld: enc.kind === 'otherworld',
      cost
    });
    let n: GameState = { ...res.state, hasTakenActionThisTurn: true };
    const follow = res.follow;

    if (follow.knockedOut) {
      commit(n);
      handleEndInvestigatorTurn();
      return;
    }
    if (follow.combatMonsterId) {
      const monster = n.activeMonsters.find(m => m.id === follow.combatMonsterId);
      if (monster) {
        commit({ ...n, currentPhase: 'INVESTIGATOR_COMBAT' });
        setCombat({ monster, investigatorId: inv.id, context: 'turn' });
        return;
      }
    }
    if (follow.otherWorldMonster && n.monsterCup.length > 0) {
      const monster = n.monsterCup[Math.floor(Math.random() * n.monsterCup.length)];
      commit(addLog(n, `${monster.name} attacks ${inv.name} in the Other World!`, 'combat'));
      setCombat({ monster, investigatorId: inv.id, context: 'otherworld' });
      return;
    }
    commit(n);

    if (follow.teleportAny) {
      setTaxiMode('free');
      return;
    }
    if (follow.encounterAt) {
      const nodeInv = n.investigators[idx];
      const monster = n.activeMonsters.find(m => m.currentNodeId === nodeInv.locationNodeId);
      if (monster) {
        commit({ ...n, currentPhase: 'INVESTIGATOR_COMBAT' });
        setCombat({ monster, investigatorId: inv.id, context: 'turn' });
      } else {
        startLocationEncounter(follow.encounterAt);
      }
      return;
    }
    if (follow.dreamlands) {
      startOtherWorldEncounter('earths_dreamlands', false);
      return;
    }
    if (enc.endsTurn) handleEndInvestigatorTurn();
  };

  // -------------------------------------------------------------
  // Gates
  // -------------------------------------------------------------
  const activeGate = gameState.openGates.find(g => g.id === gateModalId) || null;

  const handleEnterGate = () => {
    const gate = activeGate;
    setGateModalId(null);
    const s = cur();
    const idx = s.activeInvestigatorIndex;
    const inv = s.investigators[idx];
    if (!gate || !inv) return;
    let n = patchInvestigator(s, idx, i => ({
      ...i,
      otherWorldState: { worldId: gate.otherWorldId, box: 2, turnsRemaining: 2, gateLocationId: gate.locationId }
    }));
    const world = OTHER_WORLDS[gate.otherWorldId as OtherWorldId];
    n = addLog(n, `${inv.name} steps through the gate into ${world?.name} (Box 2).`, 'mythos');
    commit({ ...n, hasTakenActionThisTurn: true });
    if (inv.items.some(i => i.specialEffect === 'silver_key')) {
      handleEndInvestigatorTurn();
      return;
    }
    startOtherWorldEncounter(gate.otherWorldId as OtherWorldId, true);
  };

  const handleDestroyGate = () => {
    const gate = activeGate;
    setGateModalId(null);
    const s = cur();
    if (!gate) return;
    const idx = s.activeInvestigatorIndex;
    let n = removeGate(s, gate.id, idx, false);
    n = addLog(n, `${s.investigators[idx].name} destroys the gate at ${LOCATIONS_DATA[gate.locationId]?.name}!`, 'combat');
    sound.playCombatStrike(true);
    commit({ ...n, hasTakenActionThisTurn: true });
  };

  const handleSealWithElderSign = () => {
    const gate = activeGate;
    setGateModalId(null);
    const s = cur();
    if (!gate) return;
    const idx = s.activeInvestigatorIndex;
    const inv = s.investigators[idx];
    const sign = inv.items.find(i => i.specialEffect === 'seal_gate');
    if (!sign || inv.sanity < 2) return;
    let n = patchInvestigator(s, idx, i => ({
      ...i,
      items: i.items.filter(c => c.id !== sign.id),
      sanity: Math.max(1, i.sanity - 2)
    }));
    n = removeGate(n, gate.id, idx, true);
    n = addLog(n, `${inv.name} seals the gate at ${LOCATIONS_DATA[gate.locationId]?.name} with an Elder Sign! Doom recedes.`, 'combat');
    sound.playCombatStrike(true);
    commit({ ...n, hasTakenActionThisTurn: true });
  };

  const handleGateAttackFailed = () => {
    setGateModalId(null);
    const s = cur();
    const inv = s.investigators[s.activeInvestigatorIndex];
    commit({ ...addLog(s, `${inv.name}'s assault on the gate fails.`, 'combat'), hasTakenActionThisTurn: true });
  };

  // -------------------------------------------------------------
  // Combat
  // -------------------------------------------------------------
  const combatInvestigator = combat ? gameState.investigators.find(i => i.id === combat.investigatorId) : undefined;

  const continueMythosAttacks = () => {
    const s = cur();
    while (mythosQueue.current.length > 0) {
      const next = mythosQueue.current.shift()!;
      const inv = s.investigators.find(i => i.id === next.investigatorId);
      const monster = s.activeMonsters.find(m => m.id === next.monsterId);
      if (inv && monster && !inv.otherWorldState && monster.currentNodeId === inv.locationNodeId) {
        commit(addLog(s, `${monster.name} attacks ${inv.name}!`, 'combat'));
        setSelectedInvestigatorIdx(getInvestigatorIndex(s, inv.id));
        setCombat({ monster, investigatorId: inv.id, context: 'mythos' });
        return;
      }
    }
    completeRound();
  };

  const afterCombat = (ctx: CombatState, result: 'win' | 'flee' | 'ko') => {
    setCombat(null);
    if (ctx.context === 'mythos') {
      continueMythosAttacks();
      return;
    }
    if (ctx.context === 'otherworld') {
      handleEndInvestigatorTurn();
      return;
    }
    // Investigator phase
    if (result === 'ko') {
      handleEndInvestigatorTurn();
      return;
    }
    const s = cur();
    const inv = s.investigators.find(i => i.id === ctx.investigatorId);
    const moreMonsters = inv
      ? s.activeMonsters.some(m => m.currentNodeId === inv.locationNodeId && !s.evadedMonsterIds.includes(m.id))
      : false;
    if (!moreMonsters && (ctx.resumeMoves || 0) > 0) {
      commit({ ...s, currentPhase: 'INVESTIGATOR_MOVE', movesRemaining: ctx.resumeMoves! });
    } else {
      commit({ ...s, currentPhase: 'INVESTIGATOR_ENCOUNTER', movesRemaining: 0 });
    }
  };

  const handleCombatVictory = (monster: Monster) => {
    const ctx = combat;
    if (!ctx) return;
    const s = cur();
    const idx = getInvestigatorIndex(s, ctx.investigatorId);
    let n: GameState = {
      ...s,
      activeMonsters: s.activeMonsters.filter(m => m.id !== monster.id),
      monsterCup: s.monsterCup.filter(m => m.id !== monster.id)
    };
    n = patchInvestigator(n, idx, i => ({
      ...i,
      trophies: { ...i.trophies, monsters: [...i.trophies.monsters, monster] }
    }));
    n = addLog(n, `${s.investigators[idx].name} defeats ${monster.name} and claims its trophy!`, 'combat');
    commit(n);
    afterCombat(ctx, 'win');
  };

  const handleCombatFlee = () => {
    const ctx = combat;
    if (!ctx) return;
    const s = cur();
    const inv = s.investigators.find(i => i.id === ctx.investigatorId);
    commit({
      ...addLog(s, `${inv?.name} slips past ${ctx.monster.name}.`),
      evadedMonsterIds: [...s.evadedMonsterIds, ctx.monster.id]
    });
    afterCombat(ctx, 'flee');
  };

  const handleCombatDefeat = (cause: 'strength' | 'sanity') => {
    const ctx = combat;
    if (!ctx) return;
    const s = cur();
    commit(knockOut(s, getInvestigatorIndex(s, ctx.investigatorId), cause));
    afterCombat(ctx, 'ko');
  };

  const handleTriggerCombat = () => {
    const s = cur();
    const inv = s.investigators[s.activeInvestigatorIndex];
    const monster = s.activeMonsters.find(
      m => m.currentNodeId === inv?.locationNodeId && !s.evadedMonsterIds.includes(m.id)
    );
    if (!inv || !monster) return;
    commit({ ...s, currentPhase: 'INVESTIGATOR_COMBAT' });
    setCombat({ monster, investigatorId: inv.id, context: 'turn' });
  };

  // -------------------------------------------------------------
  // Mythos phase
  // -------------------------------------------------------------
  const handleAdvanceMythos = () => {
    const s = cur();
    if (s.currentPhase === 'MYTHOS_GATES') {
      const { d1, d2, sum } = roll2D6();
      const gateInfo = GATE_APPEARANCE_TABLE[sum] || GATE_APPEARANCE_TABLE[7];
      setDice({ open: true, dice: [d1, d2], title: 'Gate Appearance', description: `${sum}: ${gateInfo.locationName}` });
      let n = addLog(s, `Mythos: rolled [${d1}, ${d2}] = ${sum} on the Gate Appearance table — ${gateInfo.locationName}.`, 'mythos');
      const gatedBefore = n.openGates.map(g => g.locationId).filter(id => id !== gateInfo.locationId);
      n = openGateAt(n, gateInfo.locationId);
      if (gateInfo.extraMonsterSpawn && gatedBefore.length > 0) {
        n = addLog(n, 'Ancient summoning! A monster appears at every other gated location!', 'mythos');
        for (const locId of gatedBefore) n = spawnMonsterAtLocation(n, locId).state;
      }
      commit({ ...n, currentPhase: 'MYTHOS_MONSTERS_MOVE' });
    } else if (s.currentPhase === 'MYTHOS_MONSTERS_MOVE') {
      const { updatedMonsters, logs } = executeMonsterMovement(s.activeMonsters, s.investigators);
      let n: GameState = { ...s, activeMonsters: updatedMonsters, currentPhase: 'MYTHOS_MONSTERS_ATTACK' };
      if (logs.length === 0) n = addLog(n, 'The monsters lie in wait.', 'mythos');
      for (const l of logs) n = addLog(n, l, 'mythos');
      sound.playStep();
      commit(n);
    } else if (s.currentPhase === 'MYTHOS_MONSTERS_ATTACK') {
      mythosQueue.current = [];
      for (const inv of s.investigators) {
        if (inv.otherWorldState) continue;
        const monster = s.activeMonsters.find(m => m.currentNodeId === inv.locationNodeId);
        if (monster) mythosQueue.current.push({ investigatorId: inv.id, monsterId: monster.id });
      }
      if (mythosQueue.current.length === 0) commit(addLog(s, 'No monster reaches an investigator this round.', 'mythos'));
      continueMythosAttacks();
    }
  };

  // -------------------------------------------------------------
  // Cards usable outside combat
  // -------------------------------------------------------------
  const canUseCard = (card: Card) => {
    const s = gameState;
    const inv = s.investigators[selectedInvestigatorIdx];
    if (!inv || selectedInvestigatorIdx !== s.activeInvestigatorIndex) return false;
    if (s.currentPhase.startsWith('MYTHOS_') || s.currentPhase === 'GAME_OVER' || combat || encounter) return false;
    if (card.specialEffect === 'heal_strength') {
      return inv.strength < inv.maxStrength && (card.type === 'item' || !s.usedCardIds.includes(card.id));
    }
    if (card.specialEffect === 'heal_sanity') {
      return inv.sanity < inv.maxSanity && !s.usedCardIds.includes(card.id);
    }
    return false;
  };

  const handleUseCard = (card: Card) => {
    if (!canUseCard(card)) return;
    const s = cur();
    const idx = s.activeInvestigatorIndex;
    const inv = s.investigators[idx];
    let n = patchInvestigator(s, idx, i => {
      const next = { ...i };
      if (card.specialEffect === 'heal_strength') next.strength = Math.min(i.maxStrength, i.strength + 2);
      if (card.specialEffect === 'heal_sanity') next.sanity = Math.min(i.maxSanity, i.sanity + 2);
      if (card.type === 'item') next.items = i.items.filter(c => c.id !== card.id);
      return next;
    });
    if (card.type === 'item') n = { ...n, discardedItems: [...n.discardedItems, card] };
    else n = { ...n, usedCardIds: [...n.usedCardIds, card.id] };
    n = addLog(n, `${inv.name} uses ${card.name}.`);
    commit(n);
  };

  // -------------------------------------------------------------
  // Board clicks on locations (outside movement)
  // -------------------------------------------------------------
  const handleLocationClick = (locId: string) => {
    const s = cur();
    const inv = s.investigators[s.activeInvestigatorIndex];
    if (!inv || getLocationIdForNode(inv.locationNodeId) !== locId) return;
    if (s.currentPhase === 'INVESTIGATOR_ENCOUNTER' && !s.hasTakenActionThisTurn) {
      const threatened = s.activeMonsters.some(m => m.currentNodeId === inv.locationNodeId && !s.evadedMonsterIds.includes(m.id));
      if (threatened) handleTriggerCombat();
      else handleDrawEncounter();
    }
  };

  const handleStartNewGame = (configs: { name: string; color: any; strength: number; sanity: number }[]) => {
    if (moveTimer.current) clearInterval(moveTimer.current);
    setMovingPawn(null);
    setCombat(null);
    setEncounter(null);
    setGateModalId(null);
    setTaxiMode(null);
    mythosQueue.current = [];
    commit(initializeGame(configs));
    setSelectedInvestigatorIdx(0);
    setIsNewGameOpen(false);
  };

  // -------------------------------------------------------------
  // Keyboard: Space triggers the highlighted main action
  // -------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      const el = document.activeElement as HTMLElement | null;
      if (el && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(el.tagName)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const btn = document.querySelector<HTMLButtonElement>('[data-primary-action]:not([disabled])');
      if (btn) {
        e.preventDefault();
        btn.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const selectedInvestigator = gameState.investigators[selectedInvestigatorIdx];
  const encounterInvestigator = encounter ? gameState.investigators.find(i => i.id === encounter.investigatorId) : undefined;

  return (
    <div className="min-h-screen bg-[#120b07] text-[#f7efe1] flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Navigation Bar */}
      <header className="bg-[#241710] border-b-2 border-[#8c6b45] px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xl z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow border border-amber-400/50">
            <Skull className="w-5 h-5 text-amber-100" />
          </div>
          <div className="min-w-0">
            <h1 className="font-serif font-bold text-base sm:text-lg text-amber-200 tracking-wide leading-none">ARKHAM HORROR</h1>
            <p className="hidden sm:block text-[10px] text-[#bca58d] font-serif tracking-widest uppercase">1987 Chaosium Boardgame Edition</p>
          </div>
        </div>

        <div className="order-3 sm:order-none w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 text-xs">
          <div className="bg-[#382314] px-2.5 sm:px-3 py-1 rounded-full border border-[#785334] text-amber-300 font-serif font-bold">
            Turn {gameState.turnNumber}
          </div>
          <div
            className={`px-2.5 sm:px-3 py-1 rounded-full border flex items-center gap-1 font-semibold ${
              gameState.doomTrack >= 10 ? 'bg-red-900 border-red-500 text-red-100 animate-pulse' : 'bg-[#451616] border-[#882b2b] text-red-200'
            }`}
            title="Doom track — at 14 the Ancient Ones awaken"
          >
            <Skull className="w-3.5 h-3.5 text-red-400" /> Doom {gameState.doomTrack}/{gameState.maxDoom}
          </div>
          <div
            className="bg-[#1c3326] px-2.5 sm:px-3 py-1 rounded-full border border-[#2b6644] text-emerald-200 flex items-center gap-1 font-semibold"
            title={`Lose if ${gameState.investigators.length <= 3 ? 8 : 7} gates are open at once`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Gates {gameState.openGates.length}/{gameState.investigators.length <= 3 ? 8 : 7}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              sound.enabled = next;
            }}
            className="p-1.5 rounded-lg bg-[#3d2716] hover:bg-[#52341d] text-amber-200 border border-[#785334] transition"
            title={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
            aria-label={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
          </button>
          <button
            onClick={() => setIsRulesOpen(true)}
            className="flex items-center gap-1.5 bg-[#3d2716] hover:bg-[#52341d] text-amber-200 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-serif font-bold border border-[#785334] transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" /> <span className="hidden sm:inline">Rules</span>
          </button>
          <button
            onClick={() => setIsNewGameOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-serif font-bold border border-amber-500/50 transition shadow"
          >
            <RotateCcw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">New Game</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-2 sm:p-4 grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-4 max-w-[1720px] mx-auto w-full">
        <div className="xl:col-span-8 flex flex-col gap-3 min-w-0">
          <GameBoard
            gameState={gameState}
            onNodeClick={handleNodeClick}
            onLocationClick={handleLocationClick}
            onOtherWorldClick={worldId => setInspectWorldId(worldId)}
            reachableNodes={reachableNodes}
            movingPawn={movingPawn}
          />

          <div className="sticky bottom-2 z-30">
            <ActionControls
              gameState={gameState}
              isBusy={isMoving}
              onRollMovement={handleRollMovement}
              onTakeTaxi={() => setTaxiMode('paid')}
              onDrive={() => setTaxiMode('car')}
              onWaitAction={handleWaitAction}
              onDrawEncounter={handleDrawEncounter}
              onOpenGate={handleDrawEncounter}
              onTriggerCombat={handleTriggerCombat}
              onEndInvestigatorTurn={handleEndInvestigatorTurn}
              onAdvanceMythos={handleAdvanceMythos}
              onEndMovementEarly={handleEndMovementEarly}
              onExploreOtherWorld={handleExploreOtherWorld}
            />
          </div>
        </div>

        <div className="xl:col-span-4 flex flex-col gap-3 min-w-0">
          <div className="flex gap-1 bg-[#241710] p-1.5 rounded-xl border border-[#785334] overflow-x-auto">
            {gameState.investigators.map((inv, idx) => {
              const isActive = idx === activeIdx;
              const isSelected = idx === selectedInvestigatorIdx;
              return (
                <button
                  key={inv.id}
                  onClick={() => setSelectedInvestigatorIdx(idx)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition flex-1 min-w-0 ${
                    isSelected ? 'bg-amber-600 text-stone-950 shadow' : 'bg-[#382314] text-amber-200 hover:bg-[#4a311d]'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/40" style={{ backgroundColor: inv.color }} />
                  <span className="truncate">{inv.name}</span>
                  <span className="ml-auto text-[10px] font-sans font-semibold opacity-80 shrink-0">
                    {inv.strength}♥ {inv.sanity}✦
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />}
                </button>
              );
            })}
          </div>

          {selectedInvestigator && (
            <InvestigatorSheet
              investigator={selectedInvestigator}
              isActive={selectedInvestigatorIdx === activeIdx}
              onCastSpell={handleUseCard}
              onUseItem={handleUseCard}
              canUseCard={canUseCard}
            />
          )}

          <LogPanel logs={gameState.log} />
        </div>
      </main>

      {/* MODALS */}
      <DiceRoller
        isOpen={dice.open}
        onClose={() => setDice(d => ({ ...d, open: false }))}
        dice={dice.dice}
        title={dice.title}
        description={dice.description}
        autoCloseMs={1100}
      />

      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      <NewGameModal isOpen={isNewGameOpen} onStartGame={handleStartNewGame} onClose={() => setIsNewGameOpen(false)} />

      <TaxiModal
        isOpen={taxiMode !== null}
        title={taxiMode === 'paid' ? 'Arkham Yellow Cab' : taxiMode === 'car' ? 'Drive your Automobile' : 'Free Ride'}
        subtitle={taxiMode === 'paid' ? 'Fare: $1 — ride straight to any location or taxi stand.' : 'Choose where to go — no charge.'}
        monsterNodeIds={gameState.activeMonsters.map(m => m.currentNodeId)}
        gateLocationIds={gameState.openGates.map(g => g.locationId)}
        onSelectDestination={handleSelectTaxiDestination}
        onClose={() => setTaxiMode(null)}
      />

      <OtherWorldModal worldId={inspectWorldId} onClose={() => setInspectWorldId(null)} />

      {combat && combatInvestigator && (
        <CombatModal
          key={`${combat.monster.id}_${combat.investigatorId}`}
          investigator={combatInvestigator}
          monster={combat.monster}
          onVictory={handleCombatVictory}
          onFlee={handleCombatFlee}
          onDefeat={handleCombatDefeat}
          onUpdateInvestigator={updated => {
            const s = cur();
            commit(patchInvestigator(s, getInvestigatorIndex(s, updated.id), () => updated));
          }}
        />
      )}

      {encounter && encounterInvestigator && !dice.open && (
        <EncounterModal
          key={encounter.uid}
          variant={encounter.kind === 'otherworld' ? 'otherworld' : 'gazette'}
          title={encounter.title}
          subtitle={encounter.subtitle}
          roll={encounter.roll}
          text={encounter.event.text}
          options={encounter.options}
          investigator={encounterInvestigator}
          onResolve={handleResolveEncounter}
        />
      )}

      {activeGate && activeInvestigator && (
        <GateModal
          gate={activeGate}
          investigator={activeInvestigator}
          onEnterGate={handleEnterGate}
          onDestroyGate={handleDestroyGate}
          onSealWithElderSign={handleSealWithElderSign}
          onAttackFailed={handleGateAttackFailed}
          onClose={() => setGateModalId(null)}
        />
      )}

      <GameOverModal winner={gameState.winner} onRestart={() => setIsNewGameOpen(true)} />
    </div>
  );
}
