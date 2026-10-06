import React, { useState } from 'react';
import { InvestigatorColor } from '../types/game';
import { Users, Play, Shield, Brain, Sparkles, UserPlus, Trash2 } from 'lucide-react';

interface PlayerConfig {
  name: string;
  color: InvestigatorColor;
  strength: number;
  sanity: number;
}

interface NewGameModalProps {
  isOpen: boolean;
  onStartGame: (configs: PlayerConfig[]) => void;
  onClose?: () => void;
}

const PRESET_CHARACTERS: PlayerConfig[] = [
  { name: 'Prof. Armitage', color: 'blue', strength: 4, sanity: 6 },
  { name: 'Harvey Walters', color: 'green', strength: 4, sanity: 6 },
  { name: 'Michael McGlen', color: 'red', strength: 7, sanity: 3 },
  { name: 'Sister Mary', color: 'silver', strength: 3, sanity: 7 },
  { name: 'Bob Jenkins', color: 'orange', strength: 5, sanity: 5 },
  { name: 'Gloria Goldberg', color: 'purple', strength: 4, sanity: 6 }
];

const AVAILABLE_COLORS: InvestigatorColor[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
  'black',
  'silver'
];

export const NewGameModal: React.FC<NewGameModalProps> = ({
  isOpen,
  onStartGame,
  onClose
}) => {
  const [players, setPlayers] = useState<PlayerConfig[]>([
    { name: 'Prof. Armitage', color: 'blue', strength: 4, sanity: 6 },
    { name: 'Harvey Walters', color: 'green', strength: 5, sanity: 5 }
  ]);

  if (!isOpen) return null;

  const handleAddPlayer = () => {
    if (players.length >= 4) return;
    const unusedPreset = PRESET_CHARACTERS.find(
      p => !players.some(existing => existing.name === p.name)
    ) || {
      name: `Investigator ${players.length + 1}`,
      color: AVAILABLE_COLORS[players.length % AVAILABLE_COLORS.length],
      strength: 5,
      sanity: 5
    };

    setPlayers([...players, { ...unusedPreset }]);
  };

  const handleRemovePlayer = (idx: number) => {
    if (players.length <= 1) return;
    setPlayers(players.filter((_, i) => i !== idx));
  };

  const handleUpdateStrength = (idx: number, newStrength: number) => {
    const str = Math.max(3, Math.min(7, newStrength));
    const san = 10 - str;
    setPlayers(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], strength: str, sanity: san };
      return copy;
    });
  };

  const handleUpdateName = (idx: number, name: string) => {
    setPlayers(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], name };
      return copy;
    });
  };

  const handleUpdateColor = (idx: number, color: InvestigatorColor) => {
    setPlayers(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], color };
      return copy;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#241710] text-[#f5ecd8] border-3 border-[#8c6b45] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-[#180e0a] p-5 border-b border-[#8c6b45] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-900 border border-amber-600 flex items-center justify-center text-amber-200">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl text-amber-200">
                1987 Arkham Horror — Solo Game Setup
              </h2>
              <p className="text-xs text-[#b89f82]">
                Configure 1 to 4 investigators to battle the ancient horrors of Arkham.
              </p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-xs text-stone-400 hover:text-white">
              Cancel
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Rules Reminder Banner */}
          <div className="bg-[#1b110a] border border-[#5c3e29] p-3.5 rounded-xl text-xs text-[#caa888] space-y-1">
            <strong className="text-amber-300 font-serif block">1987 Chaosium Rule Step Five:</strong>
            Divide 10 points between starting Strength and Sanity points (each between 3 and 7). Each investigator begins with $13 cash, 3 items, 1 spell, 1 skill, and 1 charity card at the Train Station.
          </div>

          {/* Investigators List */}
          <div className="space-y-3">
            {players.map((player, idx) => (
              <div
                key={idx}
                className="bg-[#2f1f15] border border-[#7a573b] p-4 rounded-xl space-y-3 relative shadow-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs font-serif font-bold text-amber-300">
                      Investigator #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={player.name}
                      onChange={e => handleUpdateName(idx, e.target.value)}
                      className="bg-[#1b1009] border border-[#6b4c33] text-amber-100 px-3 py-1.5 rounded-lg text-sm font-semibold flex-1 max-w-xs focus:outline-none focus:border-amber-500"
                      placeholder="Investigator Name"
                    />
                  </div>

                  {/* Color Selector */}
                  <div className="flex items-center gap-1.5">
                    {AVAILABLE_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleUpdateColor(idx, c)}
                        className={`w-6 h-6 rounded-full border-2 transition ${
                          player.color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}

                    {players.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePlayer(idx)}
                        className="ml-2 p-1.5 text-stone-400 hover:text-rose-400 rounded transition"
                        title="Remove Investigator"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 10-point stat allocation slider */}
                <div className="bg-[#1c120a] p-3 rounded-lg border border-[#5a3a24] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-rose-400" />
                    <span className="text-xs text-rose-300 font-bold">
                      Strength: {player.strength}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-1 max-w-xs px-2">
                    <span className="text-[10px] text-rose-400 font-bold">3</span>
                    <input
                      type="range"
                      min="3"
                      max="7"
                      value={player.strength}
                      onChange={e => handleUpdateStrength(idx, parseInt(e.target.value, 10))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <span className="text-[10px] text-rose-400 font-bold">7</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-blue-300 font-bold">
                      Sanity: {player.sanity}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add investigator button */}
          {players.length < 4 && (
            <button
              type="button"
              onClick={handleAddPlayer}
              className="w-full border-2 border-dashed border-[#7a573b] hover:border-amber-500 hover:bg-[#2e1d13] text-[#caa888] hover:text-amber-200 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Add Another Investigator (Up to 4)
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#180e0a] p-5 border-t border-[#8c6b45] flex items-center justify-between">
          <span className="text-xs text-[#a3876e]">
            {players.length} Investigator{players.length > 1 ? 's' : ''} Ready
          </span>

          <button
            type="button"
            onClick={() => onStartGame(players)}
            className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-xl transition transform active:scale-95 flex items-center gap-2 text-sm"
          >
            <Play className="w-4 h-4" /> Begin Investigation
          </button>
        </div>
      </div>
    </div>
  );
};
