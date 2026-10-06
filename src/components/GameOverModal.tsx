import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Award, Skull, RotateCcw, Trophy } from 'lucide-react';
import { GameState } from '../types/game';

interface GameOverModalProps {
  winner: GameState['winner'];
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ winner, onRestart }) => {
  if (!winner) return null;

  useEffect(() => {
    if (winner.isVictory) {
      try {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Ignore in environments where canvas may not be available
      }
    }
  }, [winner]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#241710] text-[#f5ecd8] border-4 border-[#8c6b45] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-center">
        {/* Banner */}
        <div
          className={`p-6 border-b-2 ${
            winner.isVictory
              ? 'bg-gradient-to-b from-amber-900 to-[#3b2715] border-amber-500'
              : 'bg-gradient-to-b from-rose-950 to-[#30120c] border-rose-700'
          }`}
        >
          {winner.isVictory ? (
            <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-2 animate-bounce" />
          ) : (
            <Skull className="w-16 h-16 text-rose-500 mx-auto mb-2 animate-pulse" />
          )}

          <h2 className="font-serif font-black text-2xl tracking-wide">
            {winner.isVictory ? 'VICTORY OVER THE MYTHOS!' : 'DOOM OF ARKHAM!'}
          </h2>
          <p className="text-xs text-[#d6bda4] font-serif mt-1">
            {winner.reason}
          </p>
        </div>

        {/* Honor Roll */}
        <div className="p-6 space-y-4">
          <div className="bg-[#1a0f0a] border border-[#5c3e29] p-4 rounded-xl text-left">
            <h4 className="text-xs font-serif font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" /> The Roll of Honor
            </h4>

            {winner.firstCitizen && (
              <p className="text-xs text-amber-200 font-semibold mb-3 bg-amber-950/60 p-2 rounded border border-amber-800">
                Proclaimed First Citizen of Arkham: <span className="text-white font-bold">{winner.firstCitizen}</span>
              </p>
            )}

            <div className="space-y-2 text-xs">
              {winner.honorRoll.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-[#2a190f] border border-[#4a2e19]"
                >
                  <span className="font-bold text-amber-100">{entry.name}</span>
                  <div className="flex gap-3 text-stone-300 text-[11px]">
                    <span>{entry.gatesClosed} Gates Closed</span>
                    <span>{entry.monsterTrophies} Monsters Defeated</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onRestart}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-3 rounded-xl shadow-xl transition flex items-center justify-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" /> Start A New Investigation
          </button>
        </div>
      </div>
    </div>
  );
};
