import React, { useState, useEffect } from 'react';
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
  STREET_NODES,
  GATE_APPEARANCE_TABLE
} from './data/rules1987';
import { GameBoard } from './components/GameBoard';
import { InvestigatorSheet } from './components/InvestigatorSheet';
import { ActionControls } from './components/ActionControls';
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
  VolumeX
} from 'lucide-react';
import { sound } from './utils/audio';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => initializeGame());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [reachableNodes, setReachableNodes] = useState<string[]>([]);
  const [selectedInvestigatorIdx, setSelectedInvestigatorIdx] = useState<number>(0);

  // Modals state
  const [isNewGameOpen, setIsNewGameOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isTaxiOpen, setIsTaxiOpen] = useState(false);
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
    } else {
      setReachableNodes([]);
    }
  }, [gameState.hasRolledMovement, gameState.movesRemaining, activeInvestigator?.locationNodeId]);

  // -------------------------------------------------------------
  // ACTION HANDLERS
  // -------------------------------------------------------------

  // 1. Roll Movement (2D6)
  const handleRollMovement = () => {
    if (!activeInvestigator) return;
    const { d1, d2, sum } = roll2D6();
    let totalMoves = sum;

    // Check for Motorcycle bonus
    if (activeInvestigator.items.some(i => i.specialEffect === 'motorcycle_move')) {
      totalMoves += 2;
    }

    sound.playDiceRoll();
    addLog(`${activeInvestigator.name} rolled movement: [${d1}, ${d2}] = ${totalMoves} movement points.`);

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

  // 2. Click node or location to move along streets
  const handleNodeClick = (targetNodeId: string) => {
    if (!activeInvestigator || !gameState.hasRolledMovement || gameState.movesRemaining <= 0) return;
    if (!reachableNodes.includes(targetNodeId)) return;

    // Move investigator to target node
    const updatedInvestigators = [...gameState.investigators];
    const current = updatedInvestigators[gameState.activeInvestigatorIndex];
    current.locationNodeId = targetNodeId;

    const targetNode = STREET_NODES[targetNodeId];
    addLog(`${current.name} moved to ${targetNode?.name || targetNodeId}.`);

    // Check if monster in this space: if so, movement stops immediately!
    const monstersHere = gameState.activeMonsters.filter(m => m.currentNodeId === targetNodeId);
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

    // Deduct 1 move or finish
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
  };

  // Stop movement early
  const handleEndMovementEarly = () => {
    addLog(`${activeInvestigator.name} stopped movement.`);
    setGameState(prev => ({
      ...prev,
      movesRemaining: 0,
      currentPhase: 'INVESTIGATOR_ENCOUNTER'
    }));
  };

  // Click on a Location building
  const handleLocationClick = (locId: string) => {
    const loc = LOCATIONS_DATA[locId];
    if (!loc) return;

    // If active investigator is at pointer node and currently moving, enter location!
    if (activeInvestigator && activeInvestigator.locationNodeId === loc.pointerNodeId && gameState.hasRolledMovement) {
      const updatedInvestigators = [...gameState.investigators];
      updatedInvestigators[gameState.activeInvestigatorIndex].locationNodeId = locId;

      addLog(`${activeInvestigator.name} entered ${loc.name}.`);
      setGameState(prev => ({
        ...prev,
        investigators: updatedInvestigators,
        movesRemaining: 0,
        currentPhase: 'INVESTIGATOR_ENCOUNTER'
      }));
      return;
    }

    // If investigator is already here, check for gate
    const gateHere = gameState.openGates.find(g => g.locationId === locId);
    if (gateHere && activeInvestigator?.locationNodeId === locId) {
      setActiveGateModal(gateHere);
    }
  };

  // Take Taxi ($1 fast travel)
  const handleSelectTaxiDestination = (destId: string) => {
    if (!activeInvestigator || activeInvestigator.money < 1) return;

    const updated = [...gameState.investigators];
    const inv = updated[gameState.activeInvestigatorIndex];
    inv.money -= 1;
    inv.locationNodeId = destId;

    const destName = LOCATIONS_DATA[destId]?.name || STREET_NODES[destId]?.name || destId;
    addLog(`${inv.name} paid $1 and took an Arkham Yellow Cab to ${destName}.`);

    setIsTaxiOpen(false);

    // Check if monster in this space
    const monstersHere = gameState.activeMonsters.filter(m => m.currentNodeId === destId);
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
    const locId = activeInvestigator.locationNodeId;
    const location = LOCATIONS_DATA[locId];

    if (!location) {
      addLog(`${activeInvestigator.name} stops in an empty street space.`);
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

  // Resolve Encounter Modal
  const handleResolveEncounter = (event: LocationEvent) => {
    if (!activeInvestigator || !activeEncounter) return;

    const updated = [...gameState.investigators];
    const inv = updated[gameState.activeInvestigatorIndex];

    // Apply rewards / consequences
    if (event.reward) {
      if (event.reward.money) inv.money = Math.max(0, inv.money + event.reward.money);
      if (event.reward.strength) inv.strength = Math.min(inv.maxStrength, Math.max(1, inv.strength + event.reward.strength));
      if (event.reward.sanity) inv.sanity = Math.min(inv.maxSanity, Math.max(1, inv.sanity + event.reward.sanity));
      if (event.reward.retainer) inv.hasRetainer = true;

      // Draw items
      if (event.reward.itemsCount && gameState.itemDeck.length > 0) {
        const drawn = gameState.itemDeck.slice(0, event.reward.itemsCount);
        inv.items.push(...drawn);
      }

      // Draw spells
      if (event.reward.spellsCount && gameState.spellDeck.length > 0) {
        const drawn = gameState.spellDeck.slice(0, event.reward.spellsCount);
        inv.spells.push(...drawn);
      }

      // Gate spawn
      if (event.reward.gateSpawn) {
        spawnGateAtLocation(activeEncounter.locationId);
      }

      // Monster spawn
      if (event.reward.monsterSpawn && gameState.monsterCup.length > 0) {
        const cup = [...gameState.monsterCup];
        const newMonster = cup.pop()!;
        newMonster.currentNodeId = activeEncounter.locationId;
        setGameState(prev => ({
          ...prev,
          activeMonsters: [...prev.activeMonsters, newMonster],
          monsterCup: cup
        }));
        addLog(`A monster spawned at ${LOCATIONS_DATA[activeEncounter.locationId]?.name}!`, 'mythos');
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
      addLog(`Gate already present at ${loc.name}. A monster appears!`, 'mythos');
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

    const world = OTHER_WORLDS[activeGateModal.otherWorldId as keyof typeof OTHER_WORLDS];
    addLog(`${inv.name} stepped through the gate into ${world.name} (Entered Box 2).`, 'event');

    setActiveGateModal(null);
    setGameState(prev => ({
      ...prev,
      investigators: updated,
      hasTakenActionThisTurn: true
    }));
  };

  // Destroy Gate via combat
  const handleDestroyGate = () => {
    if (!activeInvestigator || !activeGateModal) return;

    const updated = [...gameState.investigators];
    const inv = updated[gameState.activeInvestigatorIndex];

    inv.trophies.gates.push(activeGateModal);

    addLog(`${inv.name} obliterated the dimensional gate at ${LOCATIONS_DATA[activeGateModal.locationId]?.name}!`, 'combat');

    setGameState(prev => ({
      ...prev,
      investigators: updated,
      openGates: prev.openGates.filter(g => g.id !== activeGateModal.id),
      hasTakenActionThisTurn: true
    }));

    setActiveGateModal(null);
  };

  // Inscribe Elder Sign on Gate
  const handleSealWithElderSign = () => {
    if (!activeInvestigator || !activeGateModal) return;

    const updated = [...gameState.investigators];
    const inv = updated[gameState.activeInvestigatorIndex];

    // Spend 2 sanity
    inv.sanity = Math.max(1, inv.sanity - 2);

    // Remove elder sign item
    const signIdx = inv.items.findIndex(i => i.specialEffect === 'seal_gate');
    if (signIdx !== -1) {
      inv.items.splice(signIdx, 1);
    }

    inv.trophies.gates.push(activeGateModal);

    addLog(`${inv.name} spent 2 Sanity points and inscribed an Elder Sign at ${LOCATIONS_DATA[activeGateModal.locationId]?.name}! The gate is permanently closed and sealed!`, 'combat');

    setGameState(prev => ({
      ...prev,
      investigators: updated,
      openGates: prev.openGates.filter(g => g.id !== activeGateModal.id),
      doomTrack: Math.max(1, prev.doomTrack - 1), // Rule: move doom factor counter back one space
      hasTakenActionThisTurn: true
    }));

    setActiveGateModal(null);
  };

  // End active investigator's turn & advance to next investigator or Mythos
  const handleEndInvestigatorTurn = () => {
    const nextIdx = gameState.activeInvestigatorIndex + 1;

    if (nextIdx < gameState.investigators.length) {
      // Next investigator's turn
      const nextInv = gameState.investigators[nextIdx];

      // Handle start of turn income for retainer
      const updated = [...gameState.investigators];
      if (nextInv.hasRetainer) {
        nextInv.money += 2;
        addLog(`${nextInv.name} collected $2 Retainer fee from the bank.`);
      }

      // Handle Other World progression
      if (nextInv.otherWorldState) {
        if (nextInv.otherWorldState.box === 2) {
          nextInv.otherWorldState.box = 1;
          addLog(`${nextInv.name} advanced to Box 1 in ${OTHER_WORLDS[nextInv.otherWorldState.worldId as keyof typeof OTHER_WORLDS].name}.`);
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
            m.currentNodeId = gate.locationId;
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

  // Combat victory callback
  const handleCombatVictory = (monster: Monster) => {
    if (!activeInvestigator) return;
    const updated = [...gameState.investigators];
    const inv = updated[gameState.activeInvestigatorIndex];

    inv.trophies.monsters.push(monster);

    addLog(`${inv.name} defeated ${monster.name}! Claimed as monster trophy.`, 'combat');

    setGameState(prev => ({
      ...prev,
      investigators: updated,
      activeMonsters: prev.activeMonsters.filter(m => m.id !== monster.id),
      currentPhase: 'INVESTIGATOR_ENCOUNTER'
    }));

    setActiveCombatMonster(null);
  };

  // Start a new game with customized investigators
  const handleStartCustomGame = (playerConfigs: { name: string; color: any; strength: number; sanity: number }[]) => {
    const freshGame = initializeGame(playerConfigs, true);
    setGameState(freshGame);
    setSelectedInvestigatorIdx(0);
    setIsNewGameOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#140c07] text-[#f5ecd8] flex flex-col font-sans selection:bg-amber-800 selection:text-white">
      {/* Top Vintage Navigation Header */}
      <header className="bg-[#1f130b] border-b-2 border-[#5a3a24] px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-xl z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-900 border border-amber-600 flex items-center justify-center font-serif font-black text-amber-200 text-lg shadow-inner">
            AH
          </div>
          <div>
            <h1 className="font-serif font-bold text-xl text-amber-200 tracking-wide leading-tight">
              Arkham Horror <span className="text-xs font-sans text-amber-500 font-semibold">(1987 Chaosium Edition)</span>
            </h1>
            <p className="text-[11px] text-[#caa888]">
              Online Co-Op & Solo Board Game for Monster Hunters
            </p>
          </div>
        </div>

        {/* Global Game Status Badges */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 bg-[#2d1b10] border border-[#7a4e2b] px-3 py-1.5 rounded-lg shadow-sm">
            <Skull className="w-4 h-4 text-red-500 animate-pulse" />
            <span className="text-[#caa888]">Doom Track:</span>
            <strong className="text-amber-300 font-bold text-sm">
              {gameState.doomTrack} / {gameState.maxDoom}
            </strong>
          </div>

          <div className="flex items-center gap-1.5 bg-[#2d1b10] border border-[#7a4e2b] px-3 py-1.5 rounded-lg shadow-sm">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-[#caa888]">Open Gates:</span>
            <strong className="text-purple-300 font-bold text-sm">
              {gameState.openGates.length}
            </strong>
          </div>

          <div className="flex items-center gap-1.5 bg-[#2d1b10] border border-[#7a4e2b] px-3 py-1.5 rounded-lg shadow-sm">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span className="text-[#caa888]">Monsters in Arkham:</span>
            <strong className="text-rose-300 font-bold text-sm">
              {gameState.activeMonsters.length}
            </strong>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              sound.enabled = next;
            }}
            className="p-1.5 bg-[#3e2716] hover:bg-[#54351f] border border-[#7a4e2b] text-amber-200 rounded-lg transition"
            title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
          </button>

          <button
            onClick={() => setIsNewGameOpen(true)}
            className="flex items-center gap-1.5 bg-[#3e2716] hover:bg-[#54351f] border border-[#7a4e2b] text-amber-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <Users className="w-4 h-4" /> New Game / Solo
          </button>

          <button
            onClick={() => setIsRulesOpen(true)}
            className="flex items-center gap-1.5 bg-[#3e2716] hover:bg-[#54351f] border border-[#7a4e2b] text-amber-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <BookOpen className="w-4 h-4" /> 1987 Rules
          </button>
        </div>
      </header>

      {/* Main Game Interface Layout */}
      <main className="flex-1 p-4 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Interactive 1987 Board (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <GameBoard
            gameState={gameState}
            onNodeClick={handleNodeClick}
            onLocationClick={handleLocationClick}
            onOtherWorldClick={worldId => setInspectWorldId(worldId)}
            reachableNodes={reachableNodes}
          />

          {/* Action Controls Toolbar under the board */}
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

        {/* Right Column: Character Sheets, Log & Roster (4 cols) */}
        <div className="lg:col-span-4 space-y-4 flex flex-col">
          {/* Investigators Selector Tabs */}
          <div className="bg-[#1f130b] p-2 rounded-xl border border-[#5a3a24] flex gap-1.5 overflow-x-auto">
            {gameState.investigators.map((inv, idx) => {
              const isSelected = selectedInvestigatorIdx === idx;
              const isCurrentTurn = gameState.activeInvestigatorIndex === idx;

              return (
                <button
                  key={inv.id}
                  onClick={() => setSelectedInvestigatorIdx(idx)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-serif font-bold transition flex items-center justify-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-[#4a2e19] text-amber-200 border border-amber-600 shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: inv.color }}
                  />
                  <span>{inv.name.split(' ')[0]}</span>
                  {isCurrentTurn && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Investigator Character Sheet */}
          {gameState.investigators[selectedInvestigatorIdx] && (
            <InvestigatorSheet
              investigator={gameState.investigators[selectedInvestigatorIdx]}
              isActive={gameState.activeInvestigatorIndex === selectedInvestigatorIdx}
            />
          )}

          {/* Typewriter Event Log */}
          <LogPanel logs={gameState.log} />
        </div>
      </main>

      {/* ======================================================== */}
      {/* MODALS */}
      {/* ======================================================== */}
      <NewGameModal
        isOpen={isNewGameOpen}
        onStartGame={handleStartCustomGame}
        onClose={() => setIsNewGameOpen(false)}
      />

      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      <TaxiModal
        isOpen={isTaxiOpen}
        onSelectDestination={handleSelectTaxiDestination}
        onClose={() => setIsTaxiOpen(false)}
      />

      <OtherWorldModal
        worldId={inspectWorldId}
        onClose={() => setInspectWorldId(null)}
      />

      {/* Combat Modal */}
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
              locationNodeId: 'hospital',
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
