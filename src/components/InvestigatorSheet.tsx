import React from 'react';
import { Investigator, Card, Monster, Gate } from '../types/game';
import { Shield, Brain, DollarSign, Award, Scroll, Sword, Sparkles, Key, HeartPulse, User } from 'lucide-react';

interface InvestigatorSheetProps {
  investigator: Investigator;
  isActive: boolean;
  onUseItem?: (item: Card) => void;
  onCastSpell?: (spell: Card) => void;
}

export const InvestigatorSheet: React.FC<InvestigatorSheetProps> = ({
  investigator,
  isActive,
  onUseItem,
  onCastSpell
}) => {
  const colorBorders: Record<string, string> = {
    red: 'border-red-600 ring-red-400',
    blue: 'border-blue-600 ring-blue-400',
    green: 'border-green-600 ring-green-400',
    yellow: 'border-amber-500 ring-amber-300',
    purple: 'border-purple-600 ring-purple-400',
    orange: 'border-orange-500 ring-orange-300',
    black: 'border-neutral-800 ring-neutral-500',
    silver: 'border-slate-400 ring-slate-200'
  };

  return (
    <div
      className={`bg-[#fdfaf2] text-[#2c1d11] p-4 rounded-xl border-3 shadow-lg transition-all ${
        isActive
          ? `${colorBorders[investigator.color]} ring-4 shadow-xl bg-[#fffdf9]`
          : 'border-[#8c6b45]/50 opacity-90'
      }`}
    >
      {/* Header with Name, Color Badge & Location */}
      <div className="flex items-center justify-between pb-3 border-b border-[#8c6b45]/30">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
            style={{ backgroundColor: investigator.color }}
          >
            {investigator.name[0]}
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg leading-tight flex items-center gap-2">
              {investigator.name}
              {isActive && (
                <span className="text-[10px] uppercase font-sans tracking-widest px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-semibold">
                  Active Turn
                </span>
              )}
            </h3>
            <p className="text-xs text-[#714f33] font-sans">
              Location: <span className="font-semibold">{investigator.locationNodeId.replace('node_', '').replace(/_/g, ' ')}</span>
              {investigator.otherWorldState && (
                <span className="text-purple-700 font-bold ml-1">
                  (Other World: Box {investigator.otherWorldState.box})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Money & Retainer */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#f3ebd7] border border-[#8c6b45] px-2.5 py-1 rounded-md text-sm font-bold text-[#451a03]">
            <DollarSign className="w-4 h-4 text-emerald-700" />
            <span>${investigator.money}</span>
          </div>
          {investigator.hasRetainer && (
            <span className="text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-medium shadow-sm">
              +$2 Retainer
            </span>
          )}
        </div>
      </div>

      {/* 1987 Authentic Strength & Sanity Trackers (Pointers 1 to 7) */}
      <div className="grid grid-cols-2 gap-3 my-3">
        {/* Strength Points */}
        <div className="bg-[#f7efe0] p-2.5 rounded-lg border border-[#c2a682]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-serif font-bold flex items-center gap-1 text-[#831843]">
              <Shield className="w-3.5 h-3.5" /> STRENGTH
            </span>
            <span className="text-xs font-bold text-[#831843]">
              {investigator.strength} / {investigator.maxStrength}
            </span>
          </div>
          {/* Track 1-7 */}
          <div className="flex gap-1 justify-between">
            {[1, 2, 3, 4, 5, 6, 7].map(num => {
              const isCurrent = investigator.strength === num;
              const isAllowedMax = num <= investigator.maxStrength;
              return (
                <div
                  key={`str-${num}`}
                  className={`w-5 h-6 rounded flex items-center justify-center text-[11px] font-bold transition-all relative ${
                    isCurrent
                      ? 'bg-rose-700 text-white shadow-md ring-2 ring-rose-400 scale-105'
                      : isAllowedMax
                      ? 'bg-[#e5d4bc] text-[#5c3e24]'
                      : 'bg-[#f0e6d6] text-[#b09a80] opacity-50'
                  }`}
                >
                  {num}
                  {isCurrent && (
                    <div className="absolute -top-1 w-2 h-2 rounded-full bg-red-400 animate-ping" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sanity Points */}
        <div className="bg-[#f7efe0] p-2.5 rounded-lg border border-[#c2a682]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-serif font-bold flex items-center gap-1 text-[#1e3a8a]">
              <Brain className="w-3.5 h-3.5" /> SANITY
            </span>
            <span className="text-xs font-bold text-[#1e3a8a]">
              {investigator.sanity} / {investigator.maxSanity}
            </span>
          </div>
          {/* Track 1-7 */}
          <div className="flex gap-1 justify-between">
            {[1, 2, 3, 4, 5, 6, 7].map(num => {
              const isCurrent = investigator.sanity === num;
              const isAllowedMax = num <= investigator.maxSanity;
              return (
                <div
                  key={`san-${num}`}
                  className={`w-5 h-6 rounded flex items-center justify-center text-[11px] font-bold transition-all relative ${
                    isCurrent
                      ? 'bg-blue-700 text-white shadow-md ring-2 ring-blue-400 scale-105'
                      : isAllowedMax
                      ? 'bg-[#e5d4bc] text-[#5c3e24]'
                      : 'bg-[#f0e6d6] text-[#b09a80] opacity-50'
                  }`}
                >
                  {num}
                  {isCurrent && (
                    <div className="absolute -top-1 w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Skills Bar */}
      <div className="bg-[#ede2cb] p-2 rounded-lg border border-[#8c6b45]/30 mb-3 text-xs flex justify-around font-sans">
        <div>
          <span className="text-[#714f33]">Fight:</span>{' '}
          <strong className="text-[#3b2413]">+{investigator.stats.fightSkill}</strong>
        </div>
        <div>
          <span className="text-[#714f33]">Sneak:</span>{' '}
          <strong className="text-[#3b2413]">≤{investigator.stats.sneakSkill}</strong>
        </div>
        <div>
          <span className="text-[#714f33]">Knowledge:</span>{' '}
          <strong className="text-[#3b2413]">≤{investigator.stats.knowledgeSkill}</strong>
        </div>
        <div>
          <span className="text-[#714f33]">Fast Talk:</span>{' '}
          <strong className="text-[#3b2413]">≤{investigator.stats.fastTalkSkill}</strong>
        </div>
      </div>

      {/* Inventory & Trophies Sections */}
      <div className="space-y-2">
        {/* Items List */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#714f33] flex items-center gap-1 mb-1">
            <Sword className="w-3 h-3" /> Equipment & Weapons ({investigator.items.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {investigator.items.map(item => (
              <div
                key={item.id}
                className="group relative bg-white border border-[#b48d61] px-2 py-1 rounded text-xs flex items-center gap-1 shadow-sm hover:border-amber-600 transition"
              >
                <span className="font-medium text-[#2d1b0d]">{item.name}</span>
                {item.fightBonus && (
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1 rounded">
                    +{item.fightBonus}
                  </span>
                )}
                {item.hands && (
                  <span className="text-[9px] text-[#714f33] bg-[#f5ecd8] px-1 rounded">
                    {item.hands}H
                  </span>
                )}
                {/* Tooltip */}
                <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 z-30 w-44 bg-[#2b180d] text-amber-100 p-2 rounded text-[10px] shadow-xl border border-[#8c6b45]">
                  <p className="font-bold">{item.name}</p>
                  <p className="mt-0.5">{item.description}</p>
                  {item.price && <p className="text-amber-400 mt-1">Value: ${item.price}</p>}
                </div>
              </div>
            ))}
            {investigator.items.length === 0 && (
              <span className="text-xs text-neutral-400 italic">No items held</span>
            )}
          </div>
        </div>

        {/* Spells List */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#714f33] flex items-center gap-1 mb-1">
            <Scroll className="w-3 h-3" /> Spells ({investigator.spells.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {investigator.spells.map(spell => (
              <div
                key={spell.id}
                className="group relative bg-[#f5f3ff] border border-purple-300 px-2 py-1 rounded text-xs flex items-center gap-1 shadow-sm hover:border-purple-600 transition"
              >
                <Sparkles className="w-3 h-3 text-purple-600" />
                <span className="font-medium text-purple-950">{spell.name}</span>
                {spell.magicBonus && (
                  <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-1 rounded">
                    +{spell.magicBonus}
                  </span>
                )}
                {/* Tooltip */}
                <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 z-30 w-44 bg-[#2b180d] text-amber-100 p-2 rounded text-[10px] shadow-xl border border-purple-500">
                  <p className="font-bold text-purple-300">{spell.name}</p>
                  <p className="mt-0.5">{spell.description}</p>
                  {spell.sanityCost !== undefined && (
                    <p className="text-rose-400 mt-1">Cost: {spell.sanityCost} Sanity</p>
                  )}
                </div>
              </div>
            ))}
            {investigator.spells.length === 0 && (
              <span className="text-xs text-neutral-400 italic">No spells learned</span>
            )}
          </div>
        </div>

        {/* Trophies Bar */}
        <div className="pt-2 border-t border-[#8c6b45]/20 flex items-center justify-between text-xs text-[#714f33]">
          <span className="flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-600" /> Trophies:
          </span>
          <div className="flex gap-3 font-semibold text-[#3b2413]">
            <span>{investigator.trophies.monsters.length} Monsters</span>
            <span>{investigator.trophies.gates.length} Gates Closed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
