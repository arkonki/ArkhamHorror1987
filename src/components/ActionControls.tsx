import React from 'react';
import { GameState, OtherWorldId } from '../types/game';
import { Dices, Car, Skull, Footprints, BookOpen, Sword, CheckCircle, ArrowRight, Sparkles, Hourglass, Keyboard } from 'lucide-react';
import { LOCATIONS_DATA, OTHER_WORLDS } from '../data/rules1987';
import { getLocationIdForNode, getNodeDisplayLabel } from '../data/boardGraph';
import { getThreateningMonsters } from '../game/engine';

interface ActionControlsProps {
  gameState: GameState;
  isBusy: boolean;
  onRollMovement: () => void;
  onTakeTaxi: () => void;
  onDrive: () => void;
  onWaitAction: () => void;
  onDrawEncounter: () => void;
  onOpenGate: () => void;
  onTriggerCombat: () => void;
  onEndInvestigatorTurn: () => void;
  onAdvanceMythos: () => void;
  onEndMovementEarly: () => void;
  onExploreOtherWorld: () => void;
}

const MYTHOS_STEPS: { phase: GameState['currentPhase']; label: string }[] = [
  { phase: 'MYTHOS_GATES', label: 'Gate opens' },
  { phase: 'MYTHOS_MONSTERS_MOVE', label: 'Monsters move' },
  { phase: 'MYTHOS_MONSTERS_ATTACK', label: 'Monsters attack' }
];

const btn = {
  primary:
    'flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-serif font-bold px-4 py-2.5 rounded-lg shadow-md transition active:scale-95 ring-2 ring-amber-300/60',
  secondary:
    'flex items-center gap-2 bg-[#4a3420] hover:bg-[#5c4129] text-amber-100 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed',
  danger:
    'flex items-center gap-2 bg-red-700 hover:bg-red-600 text-white font-bold px-4 py-2.5 rounded-lg shadow-lg transition ring-2 ring-red-300/60 animate-pulse',
  gate:
    'flex items-center gap-2 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-600 hover:to-indigo-700 text-white font-serif font-bold px-4 py-2.5 rounded-lg shadow-md transition ring-2 ring-purple-300/60',
  mythos:
    'flex items-center gap-2 bg-gradient-to-r from-red-800 to-rose-900 hover:from-red-700 hover:to-rose-800 text-white font-bold px-5 py-2.5 rounded-lg shadow-xl transition active:scale-95 ring-2 ring-red-300/50'
};

const Kbd = () => (
  <kbd className="hidden sm:inline-block ml-1 text-[10px] font-mono bg-black/30 border border-white/20 rounded px-1 py-0.5 leading-none">
    Space
  </kbd>
);

export const ActionControls: React.FC<ActionControlsProps> = ({
  gameState,
  isBusy,
  onRollMovement,
  onTakeTaxi,
  onDrive,
  onWaitAction,
  onDrawEncounter,
  onOpenGate,
  onTriggerCombat,
  onEndInvestigatorTurn,
  onAdvanceMythos,
  onEndMovementEarly,
  onExploreOtherWorld
}) => {
  const activeInv = gameState.investigators[gameState.activeInvestigatorIndex];
  const phase = gameState.currentPhase;
  const isMythos = phase.startsWith('MYTHOS_');
  const isOver = phase === 'GAME_OVER';

  const threats = getThreateningMonsters(gameState, activeInv);
  const nodeId = activeInv?.locationNodeId || '';
  const locId = getLocationIdForNode(nodeId);
  const location = locId ? LOCATIONS_DATA[locId] : undefined;
  const gateHere = locId ? gameState.openGates.find(g => g.locationId === locId) : undefined;
  const placeName = location?.name || getNodeDisplayLabel(nodeId);
  const ow = activeInv?.otherWorldState;
  const world = ow ? OTHER_WORLDS[ow.worldId as OtherWorldId] : undefined;
  const hasCar = !!activeInv?.items.some(i => i.specialEffect === 'car_travel');

  // One short sentence telling the player what to do next
  let hint = '';
  let body: React.ReactNode = null;

  if (isOver) {
    hint = 'The game is over.';
  } else if (isMythos) {
    hint = 'The Mythos stirs. Resolve each step in order.';
    body = (
      <button data-primary-action onClick={onAdvanceMythos} className={btn.mythos}>
        <Skull className="w-5 h-5 text-red-300" />
        {phase === 'MYTHOS_GATES' && 'Roll for a new Gate (2D6)'}
        {phase === 'MYTHOS_MONSTERS_MOVE' && 'Move the monsters'}
        {phase === 'MYTHOS_MONSTERS_ATTACK' && 'Monster attacks & next round'}
        <Kbd />
      </button>
    );
  } else if (gameState.turnLost) {
    hint = `${activeInv?.name} must sit this turn out.`;
    body = (
      <button data-primary-action onClick={onEndInvestigatorTurn} className={btn.primary}>
        <Hourglass className="w-4 h-4" /> Continue <Kbd />
      </button>
    );
  } else if (ow && phase === 'INVESTIGATOR_START') {
    hint = `Lost in ${world?.name}. Roll on its table, then your turn ends.`;
    body = (
      <button data-primary-action onClick={onExploreOtherWorld} className={btn.gate}>
        <Sparkles className="w-5 h-5" /> Explore {world?.name} (Box {ow.box}) <Kbd />
      </button>
    );
  } else if (phase === 'INVESTIGATOR_START') {
    hint = threats.length > 0
      ? `${threats[0].name} lurks here! You may move away or face it.`
      : 'Roll to move, take a taxi, or stay where you are.';
    body = (
      <>
        <button data-primary-action onClick={onRollMovement} className={btn.primary}>
          <Dices className="w-5 h-5 text-amber-200" /> Roll Movement (2D6)
          {(activeInv?.moveBonus || 0) > 0 && <span className="text-xs text-amber-200">+{activeInv?.moveBonus}</span>}
          <Kbd />
        </button>
        <button onClick={onTakeTaxi} disabled={(activeInv?.money || 0) < 1} className={btn.secondary} title="Pay $1 to ride to any location">
          <Car className="w-4 h-4" /> Taxi ($1)
        </button>
        {hasCar && (
          <button onClick={onDrive} className={btn.secondary} title="Automobile: drive anywhere for free">
            <Car className="w-4 h-4 text-emerald-300" /> Drive (free)
          </button>
        )}
        <button onClick={onWaitAction} className={btn.secondary}>
          Stay Here
        </button>
      </>
    );
  } else if (phase === 'INVESTIGATOR_MOVE') {
    hint = `Click a highlighted space (up to ${gameState.movesRemaining} away). Monsters stop your movement.`;
    body = (
      <button data-primary-action onClick={onEndMovementEarly} disabled={isBusy} className={btn.secondary}>
        <Footprints className="w-4 h-4" /> Stop here <Kbd />
      </button>
    );
  } else if (phase === 'INVESTIGATOR_ENCOUNTER') {
    const canAct = !gameState.hasTakenActionThisTurn;
    let primary: React.ReactNode = null;
    if (threats.length > 0) {
      hint = `${threats[0].name} blocks your way — you must face it.`;
      primary = (
        <button data-primary-action onClick={onTriggerCombat} className={btn.danger}>
          <Sword className="w-5 h-5" /> Face {threats[0].name} (SP {threats[0].strength}) <Kbd />
        </button>
      );
    } else if (canAct && gateHere) {
      hint = `A gate to ${OTHER_WORLDS[gateHere.otherWorldId as OtherWorldId]?.name} swirls here.`;
      primary = (
        <button data-primary-action onClick={onOpenGate} className={btn.gate}>
          <Sparkles className="w-5 h-5" /> Confront the Gate <Kbd />
        </button>
      );
    } else if (canAct && location) {
      hint = `Draw an encounter at ${location.name}, or end your turn.`;
      primary = (
        <button data-primary-action onClick={onDrawEncounter} className={btn.primary}>
          <BookOpen className="w-5 h-5" /> Encounter at {location.name} (D6) <Kbd />
        </button>
      );
    } else {
      hint = location ? 'Your business here is done.' : 'Nothing happens on an empty street.';
    }
    body = (
      <>
        {primary}
        <button
          {...(primary ? {} : { 'data-primary-action': true })}
          onClick={onEndInvestigatorTurn}
          disabled={threats.length > 0}
          className={primary ? btn.secondary : btn.primary}
          title={threats.length > 0 ? 'Deal with the monster first' : undefined}
        >
          <CheckCircle className="w-4 h-4" /> End Turn {!primary && <Kbd />}
          <ArrowRight className="w-4 h-4" />
        </button>
      </>
    );
  } else if (phase === 'INVESTIGATOR_COMBAT') {
    hint = 'Combat in progress…';
  }

  return (
    <div className="bg-[#241a12] text-[#f5ecd8] border-2 border-[#8c6b45] rounded-xl p-3 sm:p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#5a3f28]">
        <div className="min-w-0">
          <h4 className="font-serif font-bold text-base leading-tight">
            {isMythos ? (
              <span className="text-red-400 flex items-center gap-1.5">
                <Skull className="w-4 h-4" /> Mythos Phase · Turn {gameState.turnNumber}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-200">
                <span className="w-3 h-3 rounded-full inline-block shrink-0 border border-black/40" style={{ backgroundColor: activeInv?.color }} />
                <span className="truncate">{activeInv?.name}</span>
                <span className="text-xs font-sans font-normal text-[#b89f82]">
                  · Turn {gameState.turnNumber} · {ow ? world?.name : placeName}
                </span>
              </span>
            )}
          </h4>
          <p className="text-xs text-[#d8c3a5] mt-0.5" aria-live="polite">{hint}</p>
        </div>

        {isMythos ? (
          <ol className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
            {MYTHOS_STEPS.map((s, i) => {
              const current = MYTHOS_STEPS.findIndex(x => x.phase === phase);
              return (
                <li
                  key={s.phase}
                  className={`px-2 py-1 rounded border ${
                    i === current ? 'bg-red-800 border-red-400 text-white' : i < current ? 'border-red-900 text-red-400/60 line-through' : 'border-[#5a3f28] text-[#a08668]'
                  }`}
                >
                  {i + 1}. {s.label}
                </li>
              );
            })}
          </ol>
        ) : (
          phase === 'INVESTIGATOR_MOVE' && (
            <div className="flex items-center gap-2 bg-[#362111] px-3 py-1.5 rounded-lg border border-[#a16207]">
              <Footprints className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-200">
                Moves left: <strong className="text-base text-white">{gameState.movesRemaining}</strong>
              </span>
            </div>
          )
        )}
      </div>

      <div className="pt-3 flex flex-wrap gap-2 items-center">{body}</div>

      {gameState.lastDiceRoll && !isMythos && (
        <div className="mt-2.5 hidden sm:flex items-center justify-between text-[11px] text-[#b89f82]">
          <span className="flex items-center gap-1.5">
            <Dices className="w-3.5 h-3.5 text-amber-500" />
            Last roll — {gameState.lastDiceRoll.type}: {gameState.lastDiceRoll.description}
          </span>
          <span className="flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5" /> Space = main action
          </span>
        </div>
      )}
    </div>
  );
};
