import React from 'react';
import { GameState, TurnPhase } from '../types/game';
import { Dices, Car, Skull, Footprints, BookOpen, Sword, CheckCircle, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { LOCATIONS_DATA } from '../data/rules1987';
import { getLocationIdForNode, getNodeDisplayLabel } from '../data/boardGraph';

interface ActionControlsProps {
  gameState: GameState;
  onRollMovement: () => void;
  onTakeTaxi: () => void;
  onWaitAction: () => void;
  onDrawEncounter: () => void;
  onTriggerCombat: () => void;
  onEndInvestigatorTurn: () => void;
  onAdvanceMythos: () => void;
  onEndMovementEarly: () => void;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  gameState,
  onRollMovement,
  onTakeTaxi,
  onWaitAction,
  onDrawEncounter,
  onTriggerCombat,
  onEndInvestigatorTurn,
  onAdvanceMythos,
  onEndMovementEarly
}) => {
  const activeInv = gameState.investigators[gameState.activeInvestigatorIndex];
  const currentPhase = gameState.currentPhase;
  const isMythosPhase = currentPhase.startsWith('MYTHOS_');

  // Check if monster in same node
  const monstersInSameNode = gameState.activeMonsters.filter(
    m => m.currentNodeId === activeInv?.locationNodeId
  );

  // Check if at a location using locationId mapping
  const activeNodeId = activeInv?.locationNodeId || '';
  const locId = getLocationIdForNode(activeNodeId);
  const isAtLocation = locId !== undefined && LOCATIONS_DATA[locId] !== undefined;
  const currentDisplayName = locId ? LOCATIONS_DATA[locId]?.name : getNodeDisplayLabel(activeNodeId);

  return (
    <div className="bg-[#241a12] text-[#f5ecd8] border-2 border-[#8c6b45] rounded-xl p-4 shadow-xl">
      {/* Turn Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#5a3f28]">
        <div className="flex items-center gap-3">
          <div className="bg-[#3e2715] px-3 py-1 rounded border border-[#8c6b45] font-serif font-bold text-amber-300">
            Turn {gameState.turnNumber}
          </div>
          <div>
            <h4 className="font-serif font-bold text-base leading-tight">
              {isMythosPhase ? (
                <span className="text-red-400 flex items-center gap-1.5">
                  <Skull className="w-4 h-4" /> Mythos Phase
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-200">
                  <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ backgroundColor: activeInv?.color }}
                  />
                  {activeInv?.name}'s Turn (Phase: {currentPhase.replace('INVESTIGATOR_', '')})
                </span>
              )}
            </h4>
            <p className="text-xs text-[#b89f82]">
              {isMythosPhase
                ? 'Ancient cosmic powers stir across Arkham...'
                : `Currently at: ${currentDisplayName}`}
            </p>
          </div>
        </div>

        {/* Moves remaining indicator */}
        {!isMythosPhase && gameState.hasRolledMovement && (
          <div className="flex items-center gap-2 bg-[#362111] px-3 py-1.5 rounded-lg border border-[#a16207]">
            <Footprints className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-amber-200">
              Moves Left: <strong className="text-base text-white">{gameState.movesRemaining}</strong>
            </span>
            {gameState.movesRemaining > 0 && (
              <button
                onClick={onEndMovementEarly}
                className="ml-2 text-[10px] bg-[#5a3818] hover:bg-[#784c20] text-amber-200 px-2 py-0.5 rounded transition font-bold"
              >
                Stop Here
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons Toolbar */}
      <div className="pt-3 flex flex-wrap gap-2.5 items-center">
        {/* Phase 1: Investigator Movement Actions */}
        {!isMythosPhase && currentPhase === 'INVESTIGATOR_START' && (
          <>
            <button
              onClick={onRollMovement}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-serif font-bold px-4 py-2 rounded-lg shadow-md transition transform active:scale-95"
            >
              <Dices className="w-5 h-5 text-amber-200" /> Roll Movement (2D6)
            </button>

            <button
              onClick={onTakeTaxi}
              disabled={activeInv?.money < 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold shadow-md transition ${
                activeInv?.money >= 1
                  ? 'bg-yellow-600 hover:bg-yellow-500 text-stone-950'
                  : 'bg-stone-700 text-stone-400 cursor-not-allowed opacity-50'
              }`}
              title="Pay $1 to take a taxi directly to any location or street space"
            >
              <Car className="w-4 h-4" /> Take Taxi ($1)
            </button>

            <button
              onClick={onWaitAction}
              className="flex items-center gap-1.5 bg-[#4a3420] hover:bg-[#5c4129] text-amber-200 px-3.5 py-2 rounded-lg text-sm font-semibold transition"
            >
              Wait / Stay Here
            </button>
          </>
        )}

        {/* Phase 2: Encounter Actions */}
        {!isMythosPhase && currentPhase === 'INVESTIGATOR_ENCOUNTER' && (
          <>
            {monstersInSameNode.length > 0 ? (
              <button
                onClick={onTriggerCombat}
                className="flex items-center gap-2 bg-red-700 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-lg shadow-lg animate-pulse transition"
              >
                <Sword className="w-5 h-5" /> Face Horrifying Monster ({monstersInSameNode[0].name})!
              </button>
            ) : isAtLocation ? (
              <button
                onClick={onDrawEncounter}
                className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white font-serif font-bold px-4 py-2 rounded-lg shadow-md transition transform active:scale-95"
              >
                <BookOpen className="w-5 h-5" /> Draw Location Encounter (D6) at {LOCATIONS_DATA[locId]?.name}
              </button>
            ) : (
              <button
                onClick={onEndInvestigatorTurn}
                className="flex items-center gap-2 bg-[#4a3420] hover:bg-[#5c4129] text-amber-200 px-4 py-2 rounded-lg font-semibold transition"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Empty Street Space — End Turn
              </button>
            )}
          </>
        )}

        {/* Monster Ambush check at any phase */}
        {!isMythosPhase && monstersInSameNode.length > 0 && currentPhase !== 'INVESTIGATOR_ENCOUNTER' && (
          <button
            onClick={onTriggerCombat}
            className="flex items-center gap-2 bg-red-800 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg shadow-md animate-bounce transition"
          >
            <ShieldAlert className="w-5 h-5" /> Monster Ambush: {monstersInSameNode[0].name}!
          </button>
        )}

        {/* Mythos Phase Trigger */}
        {isMythosPhase && (
          <button
            onClick={onAdvanceMythos}
            className="flex items-center gap-2 bg-gradient-to-r from-red-800 to-rose-900 hover:from-red-700 hover:to-rose-800 text-white font-bold px-5 py-2.5 rounded-lg shadow-xl transition transform active:scale-95"
          >
            <Skull className="w-5 h-5 text-red-300" />
            {currentPhase === 'MYTHOS_GATES' && 'Spawn Dimensional Gate (2D6)'}
            {currentPhase === 'MYTHOS_MONSTERS_MOVE' && 'Move Arkham Horrors'}
            {currentPhase === 'MYTHOS_MONSTERS_ATTACK' && 'Resolve Monster Attacks & Complete Round'}
            {currentPhase === 'ROUND_COMPLETE' && 'Start Next Turn Round'}
          </button>
        )}

        {/* Pass / Next button when encounter or actions resolved */}
        {!isMythosPhase && gameState.hasTakenActionThisTurn && currentPhase !== 'INVESTIGATOR_COMBAT' && (
          <button
            onClick={onEndInvestigatorTurn}
            className="flex items-center gap-1.5 ml-auto bg-amber-700 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold transition shadow-md"
          >
            Pass Turn / Next <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Movement instruction hint if rolled */}
      {!isMythosPhase && gameState.hasRolledMovement && gameState.movesRemaining > 0 && (
        <div className="mt-3 bg-[#18110b] p-2.5 rounded border border-[#5a3f28] flex items-center justify-between text-xs text-amber-200">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <strong>Moving:</strong> Click an adjacent white circle (marked with '1') or any highlighted space on the road.
          </span>
          <span className="text-amber-300 font-bold bg-[#3e2715] px-2 py-0.5 rounded border border-[#7a5433]">
            {gameState.movesRemaining} spaces left
          </span>
        </div>
      )}

      {/* Dice roll readout banner if available */}
      {gameState.lastDiceRoll && (
        <div className="mt-2.5 bg-[#18110b] p-2 rounded border border-[#5a3f28] flex items-center justify-between text-xs text-amber-200">
          <span className="flex items-center gap-1.5">
            <Dices className="w-4 h-4 text-amber-400" />
            <strong className="text-amber-300">{gameState.lastDiceRoll.type}:</strong>{' '}
            {gameState.lastDiceRoll.description}
          </span>
          <div className="flex gap-1.5 items-center">
            {gameState.lastDiceRoll.dice.map((die, idx) => (
              <span
                key={idx}
                className="w-5 h-5 bg-[#3e2715] border border-[#a16207] text-white font-bold rounded flex items-center justify-center text-xs"
              >
                {die}
              </span>
            ))}
            <span className="text-amber-400 font-bold ml-1">= {gameState.lastDiceRoll.sum}</span>
          </div>
        </div>
      )}
    </div>
  );
};
