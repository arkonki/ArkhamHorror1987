import React, { useState } from 'react';
import { Investigator } from '../types/game';
import { Newspaper, Dices, Check, Sparkles, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { EncounterOption, Outcome, describeOutcome, getCheckTarget } from '../game/encounters';
import { rollD6 } from '../game/engine';
import { sound } from '../utils/audio';

interface EncounterModalProps {
  variant: 'gazette' | 'otherworld';
  title: string;
  subtitle?: string;
  roll: number;
  text: string;
  options: EncounterOption[];
  investigator: Investigator;
  onResolve: (outcome: Outcome | undefined, cost: number, summary: string) => void;
}

export const EncounterModal: React.FC<EncounterModalProps> = ({
  variant,
  title,
  subtitle,
  roll,
  text,
  options,
  investigator,
  onResolve
}) => {
  const [checkResult, setCheckResult] = useState<{
    label: string;
    roll: number;
    target: number;
    passed: boolean;
    outcome: Outcome;
  } | null>(null);

  const isOW = variant === 'otherworld';

  const choose = (opt: EncounterOption) => {
    if (opt.check) {
      sound.playDiceRoll();
      const target = getCheckTarget(investigator, opt.check.skill);
      const r = rollD6();
      const passed = r <= target;
      setCheckResult({
        label: opt.label,
        roll: r,
        target,
        passed,
        outcome: passed ? opt.check.success : opt.check.failure
      });
      return;
    }
    onResolve(opt.outcome, opt.cost || 0, opt.label);
  };

  const toneClass = (tone?: EncounterOption['tone']) => {
    if (tone === 'danger') return 'bg-gradient-to-r from-red-800 to-rose-900 hover:from-red-700 hover:to-rose-800 text-white';
    if (tone === 'neutral') return isOW ? 'bg-[#2b1a38] hover:bg-[#3a2449] text-purple-100 border border-purple-700' : 'bg-[#efe2cb] hover:bg-[#e6d3b3] text-[#4a2e18] border border-[#bfa280]';
    return isOW
      ? 'bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-600 hover:to-indigo-700 text-white'
      : 'bg-gradient-to-r from-[#5a3a20] to-[#754d2a] hover:from-[#6d4626] hover:to-[#8a5b32] text-white';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true">
      <div
        className={`w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl border-4 ${
          isOW ? 'bg-[#1c121e] text-[#f5ecd8] border-purple-600' : 'bg-[#fcf7ec] text-[#2c1d11] border-[#5a3e2b]'
        }`}
      >
        <div className={`px-5 py-4 text-center border-b-2 ${isOW ? 'bg-gradient-to-r from-purple-950 via-[#381647] to-purple-950 border-purple-700' : 'bg-[#2a1a10] text-[#f4edd9] border-[#8c6b45]'}`}>
          <div className={`flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest mb-0.5 ${isOW ? 'text-purple-300' : 'text-amber-300'}`}>
            {isOW ? <Sparkles className="w-4 h-4" /> : <Newspaper className="w-4 h-4" />}
            {isOW ? 'Other World Encounter' : 'The Arkham Gazette'}
          </div>
          <h2 className={`font-serif font-black text-2xl tracking-wide ${isOW ? 'text-purple-100' : 'text-amber-100'}`}>{title}</h2>
          {subtitle && <p className={`text-[11px] italic mt-0.5 ${isOW ? 'text-purple-300' : 'text-[#caa888]'}`}>{subtitle}</p>}
        </div>

        <div className="p-5 space-y-4">
          <div className={`flex items-center justify-between px-3.5 py-2 rounded-lg border ${isOW ? 'bg-[#2a1338] border-purple-700' : 'bg-[#f0e4cf] border-[#a88d6f]'}`}>
            <span className="text-xs font-serif font-bold flex items-center gap-1.5">
              <Dices className="w-4 h-4" /> {investigator.name} rolled
            </span>
            <span className={`font-bold text-sm w-7 h-7 rounded-full flex items-center justify-center shadow ${isOW ? 'bg-purple-700 text-white' : 'bg-[#422917] text-white'}`}>
              {roll}
            </span>
          </div>

          <div className={`border-l-4 pl-4 py-2 text-sm leading-relaxed font-serif ${isOW ? 'border-purple-500 bg-[#241724] text-purple-50' : 'border-[#8c6b45] bg-[#fdfaf3] text-[#3d2716]'}`}>
            “{text}”
          </div>

          {!checkResult && (
            <div className="space-y-2 pt-1">
              {options.map(opt => {
                const tooPoor = (opt.cost || 0) > investigator.money;
                return (
                  <button
                    key={opt.id}
                    onClick={() => choose(opt)}
                    disabled={tooPoor}
                    className={`w-full text-left px-4 py-3 rounded-xl shadow transition flex items-center justify-between gap-3 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed ${toneClass(opt.tone)}`}
                  >
                    <span>
                      <span className="block">{opt.label}</span>
                      {(opt.detail || tooPoor) && (
                        <span className="block text-[11px] font-normal opacity-80 mt-0.5">
                          {tooPoor ? `Not enough money (you have $${investigator.money})` : opt.detail}
                        </span>
                      )}
                    </span>
                    {opt.check ? <Dices className="w-5 h-5 shrink-0" /> : <ArrowRight className="w-5 h-5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {checkResult && (
            <div className="space-y-3">
              <div
                className={`p-3 rounded-lg text-sm flex items-start gap-2 border ${
                  checkResult.passed ? 'bg-emerald-50 border-emerald-400 text-emerald-900' : 'bg-rose-50 border-rose-400 text-rose-900'
                }`}
              >
                {checkResult.passed ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
                <div>
                  <div className="font-bold">
                    {checkResult.label}: rolled {checkResult.roll} vs {checkResult.target} — {checkResult.passed ? 'Success!' : 'Failed!'}
                  </div>
                  <div className="text-xs mt-0.5">Result: {describeOutcome(checkResult.outcome)}</div>
                </div>
              </div>
              <button
                autoFocus
                onClick={() =>
                  onResolve(checkResult.outcome, 0, `${checkResult.label} ${checkResult.passed ? 'succeeded' : 'failed'}`)
                }
                className={`w-full font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm ${toneClass('primary')}`}
              >
                <Check className="w-5 h-5" /> Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
