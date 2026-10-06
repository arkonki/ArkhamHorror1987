import React from 'react';
import { LocationData, LocationEvent, Investigator } from '../types/game';
import { Newspaper, Dices, Check, ArrowRight } from 'lucide-react';

interface EncounterModalProps {
  location: LocationData;
  roll: number;
  event: LocationEvent;
  investigator: Investigator;
  onResolve: (event: LocationEvent) => void;
  onClose: () => void;
}

export const EncounterModal: React.FC<EncounterModalProps> = ({
  location,
  roll,
  event,
  investigator,
  onResolve,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#fcf7ec] text-[#2c1d11] border-4 border-[#5a3e2b] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
        {/* Newspaper Masthead */}
        <div className="bg-[#2a1a10] text-[#f4edd9] px-6 py-4 text-center border-b-2 border-[#8c6b45]">
          <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-amber-300 mb-0.5">
            <Newspaper className="w-4 h-4" /> The Arkham Gazette — Special Bulletin
          </div>
          <h2 className="font-serif font-black text-2xl tracking-wide text-amber-100">
            {location.name}
          </h2>
          <p className="text-[11px] text-[#caa888] font-sans italic mt-0.5">
            {location.description}
          </p>
        </div>

        {/* Gazette Body */}
        <div className="p-6 space-y-4">
          {/* Roll Badge */}
          <div className="flex items-center justify-between bg-[#f0e4cf] border border-[#a88d6f] px-3.5 py-2 rounded-lg">
            <span className="text-xs font-serif font-bold text-[#5c3e24] flex items-center gap-1.5">
              <Dices className="w-4 h-4 text-[#8a5d3b]" /> D6 Event Die Roll:
            </span>
            <span className="bg-[#422917] text-white font-bold text-sm w-7 h-7 rounded-full flex items-center justify-center shadow">
              {roll}
            </span>
          </div>

          {/* Event Narrative Text */}
          <div className="border-l-4 border-[#8c6b45] pl-4 py-2 bg-[#fdfaf3] text-[#3d2716] text-sm leading-relaxed font-serif">
            "{event.text}"
          </div>

          {/* Reward / Outcome Preview */}
          {event.reward && (
            <div className="bg-[#eedec4] border border-[#bfa280] p-3 rounded-lg text-xs space-y-1">
              <span className="font-bold text-[#4a2e18] uppercase tracking-wider block text-[10px]">
                Potential Consequence / Reward:
              </span>
              <div className="flex flex-wrap gap-2 text-[#3b2413]">
                {event.reward.money && (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-bold">
                    {event.reward.money > 0 ? `+$${event.reward.money}` : `-$${Math.abs(event.reward.money)}`}
                  </span>
                )}
                {event.reward.strength && (
                  <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded font-bold">
                    {event.reward.strength > 0 ? `+${event.reward.strength} Strength` : `${event.reward.strength} Strength`}
                  </span>
                )}
                {event.reward.sanity && (
                  <span className="bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 rounded font-bold">
                    {event.reward.sanity > 0 ? `+${event.reward.sanity} Sanity` : `${event.reward.sanity} Sanity`}
                  </span>
                )}
                {event.reward.itemsCount && (
                  <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-bold">
                    +{event.reward.itemsCount} Item Card(s)
                  </span>
                )}
                {event.reward.spellsCount && (
                  <span className="bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded font-bold">
                    +{event.reward.spellsCount} Spell Card(s)
                  </span>
                )}
                {event.reward.retainer && (
                  <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 px-2 py-0.5 rounded font-bold">
                    +Retainer ($2 / Turn)
                  </span>
                )}
                {event.reward.monsterSpawn && (
                  <span className="bg-red-200 text-red-900 border border-red-400 px-2 py-0.5 rounded font-bold">
                    A Monster Appears!
                  </span>
                )}
                {event.reward.gateSpawn && (
                  <span className="bg-purple-200 text-purple-900 border border-purple-400 px-2 py-0.5 rounded font-bold">
                    Dimensional Gate Opens!
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Resolution Button */}
          <div className="pt-2">
            <button
              onClick={() => onResolve(event)}
              className="w-full bg-gradient-to-r from-[#5a3a20] to-[#754d2a] hover:from-[#6d4626] hover:to-[#8a5b32] text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
            >
              <Check className="w-5 h-5 text-amber-300" /> Accept Event Outcome
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
