import React, { useState, useEffect, useRef } from 'react';
import {
  GameState,
  Investigator,
  Monster,
  Gate,
  OtherWorldId,
  LocationEvent
} from './types/game';
import {
  initializeGame,
  roll2D6,
  rollD6,
  getAvailableMoveNodes,
  executeMonsterMovement
} from './game/engine';
import {
  LOCATIONS_DATA,
  OTHER_WORLDS,
  GATE_APPEARANCE_TABLE
} from './data/rules1987';
import {
  BOARD_NODES,
  findShortestPath,
  getLocationIdForNode,
  getNodeForLocation,
  getNodeDisplayLabel,
  getNeighbors
} from './data/boardGraph';
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
import {
  Skull,
  BookOpen,
  RotateCcw,
  Sparkles,
  Info,
  ShieldAlert,
  Compass,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Footprints
} from 'lucide-react';
import { sound } from './utils/audio';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => initializeGame());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [reachableNodes, setReachableNodes] = useState<string[]>([]);
  const [adjacentNodes, setAdjacentNodes] = useState<string[]>([]);
  const [selectedInvestigatorIdx, setSelectedInvestigatorIdx] = useState<number>(0);
  const [isMovingAnimation, setIsMovingAnimation] = useState<boolean>(false);
  const [movingPawn, setMovingPawn] = useState<{
    investigatorId: string;
    currentNodeId: string;
  } | null>(null);

  // Modals state
  const [isNewGameOpen, setIsNewGameOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isTaxiOpen, setIsTaxiOpen] = useState(false);
  const [isDiceRollerOpen, setIsDiceRollerOpen] = useState(false);
  const [diceRollerData, setDiceRollerData] = useState<{
    dice: [number, number];
    title: string;
    description: string;
  }>({
    dice: [1, 1],
    title: 'Dice Roll',
    description: ''
  });
  const [inspectWorldId, setInspectWorldId] = useState<OtherWorldId | null>(null);
  const [activeGateModal, setActiveGateModal] = useState<Gate | null>(null);
  const [activeCombatMonster, setActiveCombatMonster] = useState<Monster | null>(null);
  const [activeEncounter, setActiveEncounter] = useState<{
    locationId: string;
    roll: number;
    event: LocationEvent;
  } | null>(null);

  const activeInvestigator = gameState.investigators[gameState.activeInvestigatorIndex];

  // Helper to append a chronicle log message
  const addLog = (text: string, type: 'action' | 'combat' | 'mythos' | 'event' | 'system' = 'action') => {
    setGameState(prev => ({
      ...prev,
      log: [
        ...prev.log,
        {
          id: `log_${Date.now()}_${Math.random()}`,
          timestamp: `T${prev.turnNumber}`,
          type,
          text
        }
      ]
    }));
  };

  // Check victory / loss condition after state changes
  useEffect(() => {
    if (gameState.currentPhase === 'GAME_OVER') return;

    // Victory: Turn 2+, all gates eliminated
    if (gameState.turnNumber >= 2 && gameState.openGates.length === 0) {
      let firstCitizen = gameState.investigators[0]?.name;
      let maxGates = -1;
      const honorRoll = gameState.investigators.map(inv => {
        if (inv.trophies.gates.length > maxGates) {
          maxGates = inv.trophies.gates.length;
          firstCitizen = inv.name;
        }
        return {
          name: inv.name,
          gatesClosed: inv.trophies.gates.length,
          monsterTrophies: inv.trophies.monsters.length
        };
      });

      setGameState(prev => ({
        ...prev,
        currentPhase: 'GAME_OVER',
        winner: {
          isVictory: true,
          reason: 'All dimensional gates have been eliminated! Arkham is saved from the cosmic horrors!',
          firstCitizen,
          honorRoll
        }
      }));
      return;
    }

    // Defeat: Doom Track >= 14
    if (gameState.doomTrack >= gameState.maxDoom) {
      setGameState(prev => ({
        ...prev,
        currentPhase: 'GAME_OVER',
        winner: {
          isVictory: false,
          reason: 'The Doom Factor reached the Doom of Arkham! The dimensional walls collapsed and the Ancient Ones devoured the earth.',
          honorRoll: prev.investigators.map(inv => ({
            name: inv.name,
            gatesClosed: inv.trophies.gates.length,
            monsterTrophies: inv.trophies.monsters.length
          }))
        }
      }));
      return;
    }

    // Defeat: Gates limit (8 for 1-3 players, 7 for 4 players)
    const maxGatesAllowed = gameState.investigators.length <= 3 ? 8 : 7;
    if (gameState.openGates.length >= maxGatesAllowed) {
      setGameState(prev => ({
        ...prev,
        currentPhase: 'GAME_OVER',
        winner: {
          isVictory: false,
          reason: `Too many dimensional gates (${gameState.openGates.length}) opened simultaneously across Arkham! The town was swallowed whole.`,
          honorRoll: prev.investigators.map(inv => ({
            name: inv.name,
            gatesClosed: inv.trophies.gates.length,
            monsterTrophies: inv.trophies.monsters.length
          }))
        }
      }));
    }
  }, [gameState.openGates.length, gameState.doomTrack, gameState.turnNumber]);

  // Update reachable nodes whenever movement roll occurs or moves remaining changes
  useEffect(() => {
    if (gameState.hasRolledMovement && gameState.movesRemaining > 0 && activeInvestigator) {
      const nodes = getAvailableMoveNodes(
        activeInvestigator.locationNodeId,
        gameState.movesRemaining,
        gameState.activeMonsters
      );
      setReachableNodes(nodes);
      setAdjacentNodes(getNeighbors(activeInvestigator.locationNodeId));
    } else {
      setReachableNodes([]);
      setAdjacentNodes([]);
    }
  }, [gameState.hasRolledMovement, gameState.movesRemaining, activeInvestigator?.locationNodeId]);

  // -------------------------------------------------------------
  // ACTION HANDLERS
  // -------------------------------------------------------------

  // 1. Roll Movement (2D6) with 3D physical dice tray
  const handleRollMovement = () => {
    if (!activeInvestigator) return;
    const { d1, d2, sum } = roll2D6();
    let totalMoves = sum;

    // Check for Motorcycle bonus
    if (activeInvestigator.items.some(i => i.specialEffect === 'motorcycle_move')) {
      totalMoves += 2;
    }

    setDiceRollerData({
      dice: [d1, d2],
      title: 'Movement Roll (2D6)',
      description: `${totalMoves} spaces available to traverse across Arkham.`
    });
    setIsDiceRollerOpen(true);

    addLog(`${activeInvestigator.name} rolled movement: [${d1}, ${d2}] = ${totalMoves} spaces.`);

    setGameState(prev => ({
      ...prev,
      movesRemaining: totalMoves,
      hasRolledMovement: true,
      lastDiceRoll: {
        type: 'Movement Roll',
        dice: [d1, d2],
        sum: totalMoves,
        description: `${totalMoves} spaces available to traverse.`
      }
    }));
  };

  // 2. Click node or location to move plastic pawn along streets
  const handleNodeClick = (targetNodeId: string) => {
    if (!activeInvestigator || !gameState.hasRolledMovement || gameState.movesRemaining <= 0 || isMovingAnimation) return;
    if (!reachableNodes.includes(targetNodeId)) return;
    if (targetNodeId === activeInvestigator.locationNodeId) return;

    const monsterNodeIds = gameState.activeMonsters.map(m => m.currentNodeId);
    const path = findShortestPath(
      activeInvestigator.locationNodeId,
      targetNodeId,
      gameState.movesRemaining,
      monsterNodeIds
    );

    if (!path || path.length < 2) return;

    // Path steps (excluding starting node)
    const steps = path.slice(1);
    const stepsToTake = steps.length;

    // 1-step move: instantaneous with pawn clack sound
    if (stepsToTake === 1) {
      const nextNode = steps[0];
      const updatedInvestigators = [...gameState.investigators];
      const current = updatedInvestigators[gameState.activeInvestigatorIndex];
      current.locationNodeId = nextNode;

      sound.playStep();
      addLog(`${current.name} stepped to ${getNodeDisplayLabel(nextNode)}.`);

      // Check if monster in this space: halt immediately!
      const monstersHere = gameState.activeMonsters.filter(m => m.currentNodeId === nextNode);
      if (monstersHere.length > 0) {
        addLog(`Horror encountered! ${current.name} must halt and confront ${monstersHere[0].name}!`, 'combat');
        setGameState(prev => ({
          ...prev,
          investigators: updatedInvestigators,
          movesRemaining: 0,
          currentPhase: 'INVESTIGATOR_COMBAT'
        }));
        setActiveCombatMonster(monstersHere[0]);
        return;
      }

      const remaining = gameState.movesRemaining - 1;
      if (remaining <= 0) {
        setGameState(prev => ({
          ...prev,
          investigators: updatedInvestigators,
          movesRemaining: 0,
          currentPhase: 'INVESTIGATOR_ENCOUNTER'
        }));
      } else {
        setGameState(prev => ({
          ...prev,
          investigators: updatedInvestigators,
          movesRemaining: remaining
        }));
      }
      return;
    }

    // Multi-step move: animate plastic pawn hopping space-by-space along the road!
    setIsMovingAnimation(true);
    let stepIndex = 0;

    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        const stepNode = steps[stepIndex];
        sound.playStep();

        setMovingPawn({
          investigatorId: activeInvestigator.id,
          currentNodeId: stepNode
        });

        // Check if monster in this space: halt immediately!
        const monstersHere = gameState.activeMonsters.filter(m => m.currentNodeId === stepNode);
        if (monstersHere.length > 0) {
          clearInterval(interval);
          setIsMovingAnimation(false);
          setMovingPawn(null);

          const updatedInvestigators = [...gameState.investigators];
          updatedInvestigators[gameState.activeInvestigatorIndex].locationNodeId = stepNode;

          addLog(`Movement halted! ${activeInvestigator.name} ran into ${monstersHere[0].name} at ${getNodeDisplayLabel(stepNode)}!`, 'combat');
          setGameState(prev => ({
            ...prev,
            investigators: updatedInvestigators,
            movesRemaining: 0,
            currentPhase: 'INVESTIGATOR_COMBAT'
          }));
          setActiveCombatMonster(monstersHere[0]);
          return;
        }

        stepIndex++;
      } else {
        // Finished moving full path
        clearInterval(interval);
        setIsMovingAnimation(false);
        setMovingPawn(null);

        const finalNode = steps[steps.length - 1];
        const updatedInvestigators = [...gameState.investigators];
        updatedInvestigators[gameState.activeInvestigatorIndex].locationNodeId = finalNode;

        const remainingMoves = Math.max(0, gameState.movesRemaining - stepsToTake);
        addLog(`${activeInvestigator.name} walked ${stepsToTake} spaces to ${getNodeDisplayLabel(finalNode)}.`);

        // Final space monster check
        const monstersHere = gameState.activeMonsters.filter(m => m.currentNodeId === finalNode);
        if (monstersHere.length > 0) {
          setGameState(prev => ({
            ...prev,
            investigators: updatedInvestigators,
            movesRemaining: 0,
            currentPhase: 'INVESTIGATOR_COMBAT'
          }));
          setActiveCombatMonster(monstersHere[0]);
          return;
        }

        if (remainingMoves <= 0) {
          setGameState(prev => ({
            ...prev,
            investigators: updatedInvestigators,
            movesRemaining: 0,
            currentPhase: 'INVESTIGATOR_ENCOUNTER'
          }));
        } else {
          setGameState(prev => ({
            ...prev,
            investigators: updatedInvestigators,
            movesRemaining: remainingMoves
          }));
        }
      }
    }, 160);
  };

  // Stop movement early
  const handleEndMovementEarly = () => {
    addLog(`${activeInvestigator.name} stopped movement at ${getNodeDisplayLabel(activeInvestigator.locationNodeId)}.`);
    setGameState(prev => ({
      ...prev,
      movesRemaining: 0,
      currentPhase: 'INVESTIGATOR_ENCOUNTER'
    }));
  };

  // Click on a Location building
  const handleLocationClick = (locId: string) => {
    const locNodeId = getNodeForLocation(locId);

    // If moving and this location is reachable, move right to it!
    if (locNodeId && reachableNodes.includes(locNodeId) && gameState.hasRolledMovement) {
      handleNodeClick(locNodeId);
      return;
    }

    // If active investigator is currently at this location:
    const activeLocId = getLocationIdForNode(activeInvestigator.locationNodeId) || activeInvestigator.locationNodeId;
    if (activeLocId === locId) {
      // Check for gate
      const gateHere = gameState.openGates.find(g => g.locationId === locId);
      if (gateHere) {
        setActiveGateModal(gateHere);
        return;
      }
      // If in encounter phase, draw encounter!
      if (gameState.currentPhase === 'INVESTIGATOR_ENCOUNTER') {
        handleDrawEncounter();
      }
    }
  };

  // Take Taxi ($1 fast travel)
  const handleSelectTaxiDestination = (destNodeId: string) => {
    if (!activeInvestigator || activeInvestigator.money < 1) return;

    const updated = [...gameState.investigators];
    const inv = updated[gameState.activeInvestigatorIndex];
    inv.money -= 1;
    inv.locationNodeId = destNodeId;

    const destName = getNodeDisplayLabel(destNodeId);
    addLog(`${inv.name} paid $1 and took an Arkham Yellow Cab to ${destName}.`);

    setIsTaxiOpen(false);

    // Check if monster in this space
    const monstersHere = gameState.activeMonsters.filter(m => m.currentNodeId === destNodeId);
    if (monstersHere.length > 0) {
      addLog(`Ambushed upon arrival! ${inv.name} faces ${monstersHere[0].name}!`, 'combat');
      setGameState(prev => ({
        ...prev,
        investigators: updated,
        movesRemaining: 0,
        hasRolledMovement: true,
        currentPhase: 'INVESTIGATOR_COMBAT'
      }));
      setActiveCombatMonster(monstersHere[0]);
    } else {
      setGameState(prev => ({
        ...prev,
        investigators: updated,
        movesRemaining: 0,
        hasRolledMovement: true,
        currentPhase: 'INVESTIGATOR_ENCOUNTER'
      }));
    }
  };

  // Wait / Stay in space
  const handleWaitAction = () => {
    if (!activeInvestigator) return;
    addLog(`${activeInvestigator.name} chooses to wait and observe surroundings.`);
    setGameState(prev => ({
      ...prev,
      hasRolledMovement: true,
      movesRemaining: 0,
      currentPhase: 'INVESTIGATOR_ENCOUNTER'
    }));
  };

  // Draw location encounter (D6 on Location Table)
  const handleDrawEncounter = () => {
    if (!activeInvestigator) return;
    const activeNodeId = activeInvestigator.locationNodeId;
    const locId = getLocationIdForNode(activeNodeId) || activeNodeId;
    const location = LOCATIONS_DATA[locId];

    if (!location) {
      addLog(`${activeInvestigator.name} is resting on an empty street space. No location encounter.`);
      handleEndInvestigatorTurn();
      return;
    }

    // Check if open gate here
    const gateHere = gameState.openGates.find(g => g.locationId === locId);
    if (gateHere) {
      setActiveGateModal(gateHere);
      return;
    }

    // Roll D6 on location table
    const roll = rollD6();
    const event = location.events[roll] || location.events[1];

    addLog(`${activeInvestigator.name} rolls on the ${location.name} Gazette table: [${roll}] - "${event.text}"`, 'event');

    setActiveEncounter({
      locationId: locId,
      roll,
      event
    });
  };

  // Resolve Location Encounter Modal
  const handleResolveEncounter = (event: LocationEvent) => {
    if (!activeInvestigator || !activeEncounter) return;

    const updated = [...gameState.investigators];
    const inv = updated[gameState.activeInvestigatorIndex];
    const rewards = event.reward;

    if (rewards) {
      if (rewards.strength) {
        inv.strength = Math.min(inv.maxStrength, inv.strength + rewards.strength);
        addLog(`${inv.name} received ${rewards.strength > 0 ? '+' : ''}${rewards.strength} Strength.`);
      }
      if (rewards.sanity) {
        inv.sanity = Math.min(inv.maxSanity, inv.sanity + rewards.sanity);
        addLog(`${inv.name} received ${rewards.sanity > 0 ? '+' : ''}${rewards.sanity} Sanity.`);
      }
      if (rewards.money) {
        inv.money = Math.max(0, inv.money + rewards.money);
        addLog(`${inv.name} received $${rewards.money}.`);
      }
      if (rewards.itemsCount && gameState.itemDeck.length > 0) {
        const drawn = gameState.itemDeck.slice(0, rewards.itemsCount);
        inv.items.push(...drawn);
        setGameState(prev => ({
          ...prev,
          itemDeck: prev.itemDeck.slice(rewards.itemsCount)
        }));
        addLog(`${inv.name} acquired item: ${drawn.map(i => i.name).join(', ')}.`);
      }
      if (rewards.spellsCount && gameState.spellDeck.length > 0) {
        const drawn = gameState.spellDeck.slice(0, rewards.spellsCount);
        inv.spells.push(...drawn);
        setGameState(prev => ({
          ...prev,
          spellDeck: prev.spellDeck.slice(rewards.spellsCount)
        }));
        addLog(`${inv.name} learned spell: ${drawn.map(s => s.name).join(', ')}.`);
      }
      if (rewards.gateSpawn) {
        spawnGateAtLocation(activeEncounter.locationId);
      }
      if (rewards.monsterSpawn) {
        const cup = [...gameState.monsterCup];
        if (cup.length > 0) {
          const m = cup.pop()!;
          const targetNode = getNodeForLocation(activeEncounter.locationId) || activeInvestigator.locationNodeId;
          m.currentNodeId = targetNode;
          setGameState(prev => ({
            ...prev,
            activeMonsters: [...prev.activeMonsters, m],
            monsterCup: cup
          }));
          addLog(`A monster spawned at ${LOCATIONS_DATA[activeEncounter.locationId]?.name}!`, 'mythos');
        }
      }
    }

    setActiveEncounter(null);
    setGameState(prev => ({
      ...prev,
      investigators: updated,
      hasTakenActionThisTurn: true
    }));
  };

  // Spawn Gate helper
  const spawnGateAtLocation = (locId: string) => {
    const loc = LOCATIONS_DATA[locId];
    if (!loc) return;

    // Check if gate already exists
    if (gameState.openGates.some(g => g.locationId === locId)) {
      addLog(`Gate already present at ${loc.name}. An extra monster emerges!`, 'mythos');
      return;
    }

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
    const randomWorld = worldKeys[Math.floor(Math.random() * worldKeys.length)];

    const newGate: Gate = {
      id: `gate_${Date.now()}`,
      locationId: locId,
      otherWorldId: randomWorld,
      strength: 5
    };

    addLog(`Dimensional vortex tore open at ${loc.name} connecting to ${OTHER_WORLDS[randomWorld].name}!`, 'mythos');
    sound.playEldritchPortal();

    setGameState(prev => ({
      ...prev,
      openGates: [...prev.openGates, newGate],
      doomTrack: Math.min(prev.maxDoom, prev.doomTrack + 1)
    }));
  };

  // Enter Gate into Other World
  const handleEnterGate = () => {
    if (!activeInvestigator || !activeGateModal) return;

    const updated = [...gameState.investigators];
    const inv = updated[gameState.activeInvestigatorIndex];

    inv.otherWorldState = {
      worldId: activeGateModal.otherWorldId,
      box: 2,
      turnsRemaining: 2
    };

    const worldName = OTHER_WORLDS[activeGateModal.otherWorldId as OtherWorldId]?.name || activeGateModal.otherWorldId;
    addLog(`${inv.name} stepped into the shimmering portal and entered ${worldName} (Box 2)!`, 'mythos');

    setActiveGateModal(null);
    setGameState(prev => ({
      ...prev,
      investigators: updated,
      hasTakenActionThisTurn: true
    }));
  };

  // Destroy Gate in combat
  const handleDestroyGate = () => {
    if (!activeInvestigator || !activeGateModal) return;

    const updated = [...gameState.investigators];
    const inv = updated[gameState.activeInvestigatorIndex];

    inv.trophies.gates.push(activeGateModal);

    addLog(`${inv.name} obliterated the dimensional gate at ${LOCATIONS_DATA[activeGateModal.locationId]?.name}!`, 'combat');
    sound.playCombatStrike(true);

    const remainingGates = gameState.openGates.filter(g => g.id !== activeGateModal.id);

    setActiveGateModal(null);
    setGameState(prev => ({
      ...prev,
      investigators: updated,
      openGates: remainingGates,
      hasTakenActionThisTurn: true
    }));
  };

  // Seal with Elder Sign
  const handleSealWithElderSign = () => {
    if (!activeInvestigator || !activeGateModal) return;

    const updated = [...gameState.investigators];
    const inv = updated[gameState.activeInvestigatorIndex];

    const elderSignIdx = inv.items.findIndex(i => i.specialEffect === 'seal_gate');
    if (elderSignIdx !== -1) {
      inv.items.splice(elderSignIdx, 1);
    }

    inv.sanity = Math.max(1, inv.sanity - 2);
    inv.trophies.gates.push(activeGateModal);

    addLog(`${inv.name} spent 2 Sanity points and inscribed an Elder Sign at ${LOCATIONS_DATA[activeGateModal.locationId]?.name}! The gate is permanently sealed!`, 'combat');
    sound.playCombatStrike(true);

    const remainingGates = gameState.openGates.filter(g => g.id !== activeGateModal.id);

    setActiveGateModal(null);
    setGameState(prev => ({
      ...prev,
      investigators: updated,
      openGates: remainingGates,
      doomTrack: Math.max(0, prev.doomTrack - 1),
      hasTakenActionThisTurn: true
    }));
  };

  // Combat victory
  const handleCombatVictory = (trophy: Monster) => {
    const updated = [...gameState.investigators];
    const inv = updated[gameState.activeInvestigatorIndex];

    inv.trophies.monsters.push(trophy);
    addLog(`${inv.name} defeated ${trophy.name} and claimed its trophy!`, 'combat');

    const remainingMonsters = gameState.activeMonsters.filter(m => m.id !== trophy.id);

    setActiveCombatMonster(null);
    setGameState(prev => ({
      ...prev,
      investigators: updated,
      activeMonsters: remainingMonsters,
      hasTakenActionThisTurn: true
    }));
  };

  // End active investigator's turn
  const handleEndInvestigatorTurn = () => {
    const nextIdx = gameState.activeInvestigatorIndex + 1;

    if (nextIdx < gameState.investigators.length) {
      // Advance to next investigator
      const nextInv = gameState.investigators[nextIdx];
      addLog(`It is now ${nextInv.name}'s turn.`, 'action');

      // Check if in Other World -> advance progression (Box 2 -> Box 1 -> Return)
      const updated = [...gameState.investigators];
      if (nextInv.otherWorldState) {
        if (nextInv.otherWorldState.box === 2) {
          nextInv.otherWorldState.box = 1;
          const world = OTHER_WORLDS[nextInv.otherWorldState.worldId as OtherWorldId];
          addLog(`${nextInv.name} advanced to Box 1 in ${world?.name || nextInv.otherWorldState.worldId}.`);
        } else if (nextInv.otherWorldState.box === 1) {
          nextInv.otherWorldState = undefined;
          addLog(`${nextInv.name} safely returned through the gate to Arkham!`);
        }
      }

      setGameState(prev => ({
        ...prev,
        investigators: updated,
        activeInvestigatorIndex: nextIdx,
        currentPhase: 'INVESTIGATOR_START',
        hasRolledMovement: false,
        movesRemaining: 0,
        hasTakenActionThisTurn: false
      }));
      setSelectedInvestigatorIdx(nextIdx);
    } else {
      // All investigators finished turn -> Trigger Mythos Phase
      addLog(`All investigators have completed actions. The Mythos Phase begins!`, 'mythos');
      setGameState(prev => ({
        ...prev,
        currentPhase: 'MYTHOS_GATES',
        hasRolledMovement: false,
        movesRemaining: 0
      }));
    }
  };

  // -------------------------------------------------------------
  // MYTHOS PHASE PROGRESSION
  // -------------------------------------------------------------
  const handleAdvanceMythos = () => {
    if (gameState.currentPhase === 'MYTHOS_GATES') {
      // 1. Roll on Gate Appearance Table (2D6)
      const { d1, d2, sum } = roll2D6();
      const gateInfo = GATE_APPEARANCE_TABLE[sum] || GATE_APPEARANCE_TABLE[7];
      addLog(`Mythos Step 1: Rolled [${d1}, ${d2}] = ${sum} on Gate Appearance Table (${gateInfo.locationName}).`, 'mythos');

      spawnGateAtLocation(gateInfo.locationId);

      // If Founder's Rock (7) or Lake Miskatonic (10), spawn 1 monster on each currently gated location!
      if (gateInfo.extraMonsterSpawn) {
        addLog(`Ancient summoning! An additional monster appears at each presently gated location!`, 'mythos');
        const cup = [...gameState.monsterCup];
        const newMonsters: Monster[] = [];

        for (const gate of gameState.openGates) {
          if (cup.length > 0) {
            const m = cup.pop()!;
            const targetNode = getNodeForLocation(gate.locationId) || 'LOC_TRAIN_STATION';
            m.currentNodeId = targetNode;
            newMonsters.push(m);
          }
        }

        setGameState(prev => ({
          ...prev,
          activeMonsters: [...prev.activeMonsters, ...newMonsters],
          monsterCup: cup,
          currentPhase: 'MYTHOS_MONSTERS_MOVE'
        }));
      } else {
        setGameState(prev => ({
          ...prev,
          currentPhase: 'MYTHOS_MONSTERS_MOVE'
        }));
      }
    } else if (gameState.currentPhase === 'MYTHOS_MONSTERS_MOVE') {
      // 2. All Monsters Move
      const { updatedMonsters, logs } = executeMonsterMovement(
        gameState.activeMonsters,
        gameState.investigators
      );

      logs.forEach(l => addLog(l, 'mythos'));

      setGameState(prev => ({
        ...prev,
        activeMonsters: updatedMonsters,
        currentPhase: 'MYTHOS_MONSTERS_ATTACK'
      }));
    } else if (gameState.currentPhase === 'MYTHOS_MONSTERS_ATTACK') {
      // 3. Monsters Attack investigators sharing space
      let combatTriggered = false;

      for (const inv of gameState.investigators) {
        const monsterHere = gameState.activeMonsters.find(m => m.currentNodeId === inv.locationNodeId);
        if (monsterHere) {
          addLog(`${monsterHere.name} attacks ${inv.name}!`, 'combat');
          setActiveCombatMonster(monsterHere);
          combatTriggered = true;
          break;
        }
      }

      if (!combatTriggered) {
        // Round complete, start next turn
        addLog(`Mythos Phase concludes. Game Turn ${gameState.turnNumber + 1} begins.`, 'system');

        // Retainer income for first investigator
        const updated = [...gameState.investigators];
        if (updated[0]?.hasRetainer) {
          updated[0].money += 2;
        }

        setGameState(prev => ({
          ...prev,
          investigators: updated,
          turnNumber: prev.turnNumber + 1,
          activeInvestigatorIndex: 0,
          currentPhase: 'INVESTIGATOR_START',
          hasRolledMovement: false,
          movesRemaining: 0,
          hasTakenActionThisTurn: false
        }));
        setSelectedInvestigatorIdx(0);
      }
    }
  };

  // Start New Game handler
  const handleStartNewGame = (configs: { name: string; color: any; strength: number; sanity: number }[]) => {
    const newState = initializeGame(configs);
    setGameState(newState);
    setSelectedInvestigatorIdx(0);
    setIsNewGameOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#120b07] text-[#f7efe1] flex flex-col font-sans select-none">
      {/* Top Navigation Bar */}
      <header className="bg-[#241710] border-b-2 border-[#8c6b45] px-4 py-2.5 flex items-center justify-between shadow-xl z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow border border-amber-400/50">
            <Skull className="w-5 h-5 text-amber-100" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg text-amber-200 tracking-wide leading-none">
              ARKHAM HORROR
            </h1>
            <p className="text-[10px] text-[#bca58d] font-serif tracking-widest uppercase">
              1987 Chaosium Boardgame Edition
            </p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 text-xs">
          <div className="bg-[#382314] px-3 py-1 rounded-full border border-[#785334] text-amber-300 font-serif font-bold">
            Turn {gameState.turnNumber}
          </div>
          <div className="bg-[#451616] px-3 py-1 rounded-full border border-[#882b2b] text-red-200 flex items-center gap-1 font-semibold">
            <Skull className="w-3.5 h-3.5 text-red-400" /> Doom: {gameState.doomTrack}/14
          </div>
          <div className="bg-[#1c3326] px-3 py-1 rounded-full border border-[#2b6644] text-emerald-200 flex items-center gap-1 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Gates: {gameState.openGates.length}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              sound.enabled = next;
            }}
            className="p-1.5 rounded-lg bg-[#3d2716] hover:bg-[#52341d] text-amber-200 border border-[#785334] transition"
            title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
          </button>
          <button
            onClick={() => setIsRulesOpen(true)}
            className="flex items-center gap-1.5 bg-[#3d2716] hover:bg-[#52341d] text-amber-200 px-3 py-1.5 rounded-lg text-xs font-serif font-bold border border-[#785334] transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" /> Rules Manual
          </button>
          <button
            onClick={() => setIsNewGameOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-serif font-bold border border-amber-500/50 transition shadow"
          >
            <RotateCcw className="w-3.5 h-3.5" /> New Game
          </button>
        </div>
      </header>

      {/* Main Play Area */}
      <main className="flex-1 p-4 grid grid-cols-1 xl:grid-cols-12 gap-4 max-w-[1720px] mx-auto w-full">
        {/* Left Column: Game Board (9 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-3">
          <GameBoard
            gameState={gameState}
            onNodeClick={handleNodeClick}
            onLocationClick={handleLocationClick}
            onOtherWorldClick={worldId => setInspectWorldId(worldId)}
            reachableNodes={reachableNodes}
            adjacentNodes={adjacentNodes}
            movingPawn={movingPawn}
          />

          {/* Action Controls Toolbar */}
          <ActionControls
            gameState={gameState}
            onRollMovement={handleRollMovement}
            onTakeTaxi={() => setIsTaxiOpen(true)}
            onWaitAction={handleWaitAction}
            onDrawEncounter={handleDrawEncounter}
            onTriggerCombat={() => {
              const monstersHere = gameState.activeMonsters.filter(
                m => m.currentNodeId === activeInvestigator?.locationNodeId
              );
              if (monstersHere.length > 0) setActiveCombatMonster(monstersHere[0]);
            }}
            onEndInvestigatorTurn={handleEndInvestigatorTurn}
            onAdvanceMythos={handleAdvanceMythos}
            onEndMovementEarly={handleEndMovementEarly}
          />
        </div>

        {/* Right Column: Character Dashboard & Chronicle Log (4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-3">
          {/* Character Selector Tabs */}
          <div className="flex gap-1 bg-[#241710] p-1.5 rounded-xl border border-[#785334] overflow-x-auto">
            {gameState.investigators.map((inv, idx) => {
              const isActive = idx === gameState.activeInvestigatorIndex;
              const isSelected = idx === selectedInvestigatorIdx;

              return (
                <button
                  key={inv.id}
                  onClick={() => setSelectedInvestigatorIdx(idx)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition flex-1 truncate ${
                    isSelected
                      ? 'bg-amber-600 text-stone-950 shadow'
                      : 'bg-[#382314] text-amber-200 hover:bg-[#4a311d]'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/40"
                    style={{ backgroundColor: inv.color }}
                  />
                  <span className="truncate">{inv.name}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-auto" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active / Inspected Character Sheet */}
          {gameState.investigators[selectedInvestigatorIdx] && (
            <InvestigatorSheet
              investigator={gameState.investigators[selectedInvestigatorIdx]}
              isActive={selectedInvestigatorIdx === gameState.activeInvestigatorIndex}
              onCastSpell={() => {}}
              onUseItem={() => {}}
            />
          )}

          {/* Arkham Gazette Event Chronicle */}
          <LogPanel logs={gameState.log} />
        </div>
      </main>

      {/* ======================================================== */}
      {/* MODALS */}
      {/* ======================================================== */}

      {/* 3D Physical Dice Roller Modal */}
      <DiceRoller
        isOpen={isDiceRollerOpen}
        onClose={() => setIsDiceRollerOpen(false)}
        dice={diceRollerData.dice}
        title={diceRollerData.title}
        description={diceRollerData.description}
      />

      {/* Rules Reference Manual Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* New Game Setup Modal */}
      <NewGameModal
        isOpen={isNewGameOpen}
        onStartGame={handleStartNewGame}
        onClose={() => setIsNewGameOpen(false)}
      />

      {/* Taxi Fast Travel Modal */}
      <TaxiModal
        isOpen={isTaxiOpen}
        onSelectDestination={handleSelectTaxiDestination}
        onClose={() => setIsTaxiOpen(false)}
      />

      {/* Other Worlds Card Viewer Modal */}
      <OtherWorldModal
        worldId={inspectWorldId}
        onClose={() => setInspectWorldId(null)}
      />

      {/* Combat Resolution Modal */}
      {activeCombatMonster && activeInvestigator && (
        <CombatModal
          investigator={activeInvestigator}
          monster={activeCombatMonster}
          onVictory={handleCombatVictory}
          onFlee={() => {
            setActiveCombatMonster(null);
            addLog(`${activeInvestigator.name} successfully sneaked away from ${activeCombatMonster.name}!`);
          }}
          onDefeat={updated => {
            setActiveCombatMonster(null);
            addLog(`${updated.name} fell in combat and was taken to St. Mary's Hospital!`, 'combat');
            const invs = [...gameState.investigators];
            invs[gameState.activeInvestigatorIndex] = {
              ...updated,
              locationNodeId: 'LOC_HOSPITAL',
              isInHospital: true
            };
            setGameState(prev => ({ ...prev, investigators: invs }));
          }}
          onClose={() => setActiveCombatMonster(null)}
          onUpdateInvestigator={updated => {
            const invs = [...gameState.investigators];
            invs[gameState.activeInvestigatorIndex] = updated;
            setGameState(prev => ({ ...prev, investigators: invs }));
          }}
        />
      )}

      {/* Location Encounter Modal */}
      {activeEncounter && activeInvestigator && (
        <EncounterModal
          location={LOCATIONS_DATA[activeEncounter.locationId]}
          roll={activeEncounter.roll}
          event={activeEncounter.event}
          investigator={activeInvestigator}
          onResolve={handleResolveEncounter}
          onClose={() => setActiveEncounter(null)}
        />
      )}

      {/* Dimensional Gate Modal */}
      {activeGateModal && activeInvestigator && (
        <GateModal
          gate={activeGateModal}
          investigator={activeInvestigator}
          onEnterGate={handleEnterGate}
          onDestroyGate={handleDestroyGate}
          onSealWithElderSign={handleSealWithElderSign}
          onClose={() => setActiveGateModal(null)}
        />
      )}

      {/* Game Over / Victory Modal */}
      <GameOverModal
        winner={gameState.winner}
        onRestart={() => setIsNewGameOpen(true)}
      />
    </div>
  );
}
