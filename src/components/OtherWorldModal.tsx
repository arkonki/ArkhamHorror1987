import React from 'react';
import { OtherWorldId } from '../types/game';
import { OTHER_WORLDS } from '../data/rules1987';
import { X, Sparkles, Dices } from 'lucide-react';

interface OtherWorldModalProps {
  worldId: OtherWorldId | null;
  onClose: () => void;
  onRollEncounter?: () => void;
  canRollEncounter?: boolean;
}

export const OtherWorldModal: React.FC<OtherWorldModalProps> = ({
  worldId,
  onClose,
  onRollEncounter,
  canRollEncounter
}) => {
  if (!worldId) return null;
  const world = OTHER_WORLDS[worldId];
  if (!world) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="text-[#f5ecd8] border-3 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
        style={{ backgroundColor: '#1c131a', borderColor: world.color }}
      >
        {/* Header */}
        <div
          className="p-5 flex items-center justify-between border-b"
          style={{ backgroundColor: world.color + '25', borderColor: world.color }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg"
              style={{ backgroundColor: world.color }}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-xl text-white">
                {world.name}
              </h3>
              <p className="text-xs text-amber-200">
                Dimensional Gate Encounter Table (1987 Gazette)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="bg-black/30 p-3.5 rounded-xl border border-white/10">
            <p className="text-xs text-stone-300 leading-relaxed italic">
              "{world.description}"
            </p>
          </div>

          <div>
            <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-amber-300 mb-2">
              D6 Gate Encounter Results:
            </h4>
            <div className="space-y-2">
              {Object.entries(world.table).map(([roll, text]) => (
                <div
                  key={roll}
                  className="bg-[#2a1a27]/70 border border-white/10 p-2.5 rounded-lg flex gap-3 items-start text-xs"
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow"
                    style={{ backgroundColor: world.color }}
                  >
                    {roll}
                  </span>
                  <p className="text-[#ebd9c5] leading-snug pt-0.5">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#140b12] p-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-stone-400">
            Travelers progress Box 2 → Box 1 → Return to Arkham
          </span>

          <div className="flex gap-2">
            {canRollEncounter && onRollEncounter && (
              <button
                onClick={onRollEncounter}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow"
              >
                <Dices className="w-4 h-4" /> Roll D6 Encounter
              </button>
            )}
            <button
              onClick={onClose}
              className="bg-[#3b2435] hover:bg-[#4d3045] text-stone-200 px-4 py-2 rounded-lg text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
