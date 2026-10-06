import React, { useState } from 'react';
import { Gate, Investigator, OtherWorld } from '../types/game';
import { OTHER_WORLDS, LOCATIONS_DATA } from '../data/rules1987';
import { rollD6 } from '../game/engine';
import { Sparkles, Shield, Sword, Eye, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface GateModalProps {
  gate: Gate;
  investigator: Investigator;
  onEnterGate: () => void;
  onDestroyGate: () => void;
  onSealWithElderSign: () => void;
  onClose: () => void;
}

export const GateModal: React.FC<GateModalProps> = ({
  gate,
  investigator,
  onEnterGate,
  onDestroyGate,
  onSealWithElderSign,
  onClose
}) => {
  const otherWorld = OTHER_WORLDS[gate.otherWorldId as keyof typeof OTHER_WORLDS];
  const location = LOCATIONS_DATA[gate.locationId];
  const hasElderSign = investigator.items.some(i => i.specialEffect === 'seal_gate');
  const [destroyRoll, setDestroyRoll] = useState<{ roll: number; total: number; success: boolean } | null>(null);

  const handleDestroyAttempt = () => {
    const roll = rollD6();
    const total = roll + investigator.stats.fightSkill;
    const success = total >= gate.strength;
    setDestroyRoll({ roll, total, success });

    if (success) {
      setTimeout(() => {
        onDestroyGate();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1c121e] text-[#f5ecd8] border-3 border-purple-500 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-950 via-[#381647] to-purple-950 p-4 border-b border-purple-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-200 font-serif font-bold text-xl">
            <Sparkles className="w-6 h-6 text-purple-400 animate-spin" />
            Dimensional Gate: {otherWorld?.name}
          </div>
          <span className="text-xs bg-purple-900 border border-purple-400 text-purple-200 px-2.5 py-1 rounded-full font-bold">
            At {location?.name}
          </span>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-[#2a1338] p-4 rounded-xl border border-purple-600/50 space-y-2">
            <h4 className="font-serif font-bold text-base text-purple-200">{otherWorld?.name}</h4>
            <p className="text-xs text-[#cfbad9] leading-relaxed">
              {otherWorld?.description}
            </p>
            <p className="text-xs italic text-purple-300">
              "{otherWorld?.flavor}"
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {/* Option 1: Step Through the Gate */}
            <button
              onClick={onEnterGate}
              className="w-full bg-gradient-to-r from-purple-800 to-indigo-900 hover:from-purple-700 hover:to-indigo-800 text-white font-bold p-3.5 rounded-xl shadow-lg transition flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2.5 text-left">
                <Eye className="w-5 h-5 text-purple-300" />
                <div>
                  <div className="font-bold">Step Through the Gate</div>
                  <div className="text-[11px] text-purple-200 font-normal">Explore {otherWorld?.name} (Transit to Box 2)</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-purple-300" />
            </button>

            {/* Option 2: Destroy Gate with Physical / Magical Force */}
            <div className="bg-[#241724] p-3 rounded-xl border border-purple-900/60">
              <button
                onClick={handleDestroyAttempt}
                className="w-full bg-gradient-to-r from-rose-900 to-red-950 hover:from-rose-800 hover:to-red-900 text-white font-bold py-2.5 px-4 rounded-lg shadow transition flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <Sword className="w-4 h-4 text-rose-300" />
                  <span>Attack Gate (Fight Roll vs {gate.strength} SP)</span>
                </div>
                <span className="text-xs text-rose-300">Roll D6 + Fight (+{investigator.stats.fightSkill})</span>
              </button>

              {destroyRoll && (
                <div className={`mt-2 p-2 rounded text-xs flex items-center gap-2 ${
                  destroyRoll.success ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-700'
                }`}>
                  {destroyRoll.success ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                  Roll: {destroyRoll.roll} + {investigator.stats.fightSkill} = <strong>{destroyRoll.total}</strong> ({destroyRoll.success ? 'Success! Gate Shattered!' : 'Failed! Gate resists.'})
                </div>
              )}
            </div>

            {/* Option 3: Seal with Elder Sign */}
            {hasElderSign && (
              <button
                onClick={onSealWithElderSign}
                disabled={investigator.sanity < 2}
                className={`w-full p-3.5 rounded-xl border font-bold text-sm flex items-center justify-between transition shadow-lg ${
                  investigator.sanity >= 2
                    ? 'bg-gradient-to-r from-emerald-800 to-teal-900 hover:from-emerald-700 hover:to-teal-800 text-white border-emerald-400'
                    : 'bg-stone-800 text-stone-500 border-stone-700 cursor-not-allowed opacity-50'
                }`}
              >
                <div className="flex items-center gap-2.5 text-left">
                  <Shield className="w-5 h-5 text-emerald-300" />
                  <div>
                    <div>Inscribe Elder Sign</div>
                    <div className="text-[11px] text-emerald-200 font-normal">Costs 2 Sanity points. Permanently closes & seals gate!</div>
                  </div>
                </div>
                <Sparkles className="w-5 h-5 text-emerald-300" />
              </button>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="text-xs text-purple-300 hover:text-white underline transition"
            >
              Step back onto sidewalk
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
