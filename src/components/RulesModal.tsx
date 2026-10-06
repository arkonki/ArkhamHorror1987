import React, { useState } from 'react';
import { BookOpen, X, Skull, Award, Compass, Sword, Shield, Footprints, Brain } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'turn' | 'combat' | 'gates' | 'win_lose'>('turn');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#241710] text-[#f5ecd8] border-3 border-[#8c6b45] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-[#180e0a] p-4 border-b border-[#8c6b45] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-amber-400" />
            <h3 className="font-serif font-bold text-lg text-amber-200">
              1987 Arkham Horror Rules Reference (Chaosium)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-[#5a3a24] bg-[#1a0f0a] text-xs font-serif font-bold">
          <button
            onClick={() => setActiveTab('turn')}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition ${
              activeTab === 'turn'
                ? 'border-amber-500 text-amber-300 bg-[#29170e]'
                : 'border-transparent text-[#a88a6d] hover:text-amber-200'
            }`}
          >
            Order of Play
          </button>
          <button
            onClick={() => setActiveTab('combat')}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition ${
              activeTab === 'combat'
                ? 'border-amber-500 text-amber-300 bg-[#29170e]'
                : 'border-transparent text-[#a88a6d] hover:text-amber-200'
            }`}
          >
            Combat & Sneak
          </button>
          <button
            onClick={() => setActiveTab('gates')}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition ${
              activeTab === 'gates'
                ? 'border-amber-500 text-amber-300 bg-[#29170e]'
                : 'border-transparent text-[#a88a6d] hover:text-amber-200'
            }`}
          >
            Gates & Other Worlds
          </button>
          <button
            onClick={() => setActiveTab('win_lose')}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition ${
              activeTab === 'win_lose'
                ? 'border-amber-500 text-amber-300 bg-[#29170e]'
                : 'border-transparent text-[#a88a6d] hover:text-amber-200'
            }`}
          >
            Winning & Losing
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs text-[#d6bda4] leading-relaxed font-sans">
          {activeTab === 'turn' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-serif font-bold text-sm text-amber-300 mb-1 flex items-center gap-1.5">
                  <Footprints className="w-4 h-4" /> 1. Investigator Phase
                </h4>
                <p>
                  Each investigator acts in clockwise order around the table:
                </p>
                <ul className="list-disc pl-5 mt-1.5 space-y-1 text-[#caa888]">
                  <li><strong>Start:</strong> Collect $2 if on Retainer. If in Other World Box 1, return to Arkham through matching gate.</li>
                  <li><strong>Step 1 (Acts):</strong> Move (roll 2D6), or Move & take Taxi ($1 to any space or location), or Wait.</li>
                  <li><strong>Step 2 (Encounters):</strong> If ending on an empty street, no effect. If entering a location, roll D6 on the location table or meet a monster/gate.</li>
                  <li><strong>Step 3 & 4:</strong> Face any monsters in the same space (Sanity roll, then Sneak or Fight).</li>
                </ul>
              </div>

              <div>
                <h4 className="font-serif font-bold text-sm text-rose-400 mb-1 flex items-center gap-1.5">
                  <Skull className="w-4 h-4" /> 2. Mythos Phase
                </h4>
                <p>
                  After all investigators take their turns, the dark cosmos awakens:
                </p>
                <ul className="list-disc pl-5 mt-1.5 space-y-1 text-[#caa888]">
                  <li><strong>1. Random Gate Appears:</strong> Roll 2D6 on Gate Appearance Table. Spawn a gate and monster on that location. If 7 or 10, also spawn 1 monster on each currently gated location!</li>
                  <li><strong>2. All Monsters Move:</strong> Monsters advance according to speed, intersection handedness (L or R), and flyers converge toward the nearest investigator.</li>
                  <li><strong>3. Monsters Attack:</strong> Any monsters sharing a space with investigators immediately engage in combat!</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'combat' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-serif font-bold text-sm text-blue-300 mb-1 flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-blue-400" /> Sanity Roll (SAN)
                </h4>
                <p>
                  Monsters bear an abbreviation SAN followed by two numbers (e.g. 1/3). Roll D6 against current Sanity:
                </p>
                <ul className="list-disc pl-5 mt-1.5 space-y-1 text-[#caa888]">
                  <li>If roll ≤ current Sanity: lose the points before the slash.</li>
                  <li>If roll &gt; current Sanity: lose the points after the slash.</li>
                  <li>If Sanity drops to 0: immediately placed in Sanitarium and lose 1 spell card.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-serif font-bold text-sm text-amber-300 mb-1 flex items-center gap-1.5">
                  <Footprints className="w-4 h-4 text-amber-400" /> Sneaking
                </h4>
                <p>
                  Roll D6 ≤ Sneak skill to slip past monsters into an adjacent space. (Hound of Tindalos cannot be sneaked past).
                </p>
              </div>

              <div>
                <h4 className="font-serif font-bold text-sm text-rose-300 mb-1 flex items-center gap-1.5">
                  <Sword className="w-4 h-4 text-rose-400" /> Fight Mechanics
                </h4>
                <p>
                  Roll D6 + Fight skill + Weapons (max 2 hands) + Spells vs Monster Strength Points (SP):
                </p>
                <ul className="list-disc pl-5 mt-1.5 space-y-1 text-[#caa888]">
                  <li><strong>Total ≥ Monster SP:</strong> The monster is eliminated and claimed as a trophy!</li>
                  <li><strong>Total &lt; Monster SP:</strong> The monster counterattacks, inflicting D6 strength points damage! If strength reaches 0, you are admitted to the Hospital and lose 1 item.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'gates' && (
            <div className="space-y-3">
              <h4 className="font-serif font-bold text-sm text-purple-300 mb-1">
                Other Worlds Progression & Gate Closure
              </h4>
              <p>
                There are 8 Other Worlds (Abyss, Another Dimension, City of the Great Race, Earth's Dreamlands, Great Hall of Celeano, Plateau of Leng, R'lyeh, Yuggoth).
              </p>
              <ul className="list-disc pl-5 mt-1.5 space-y-1 text-[#caa888]">
                <li><strong>Entering a Gate:</strong> Transits investigator to <strong>Box 2</strong> of that Other World. Roll on its Gate Table.</li>
                <li><strong>Next Turn:</strong> Advances to <strong>Box 1</strong>, rolls on Gate Table.</li>
                <li><strong>Following Turn:</strong> Returns through matching gate to Arkham!</li>
                <li><strong>Destroying Gates:</strong> Attack gate with physical/magical weapons + D6 roll ≥ gate strength.</li>
                <li><strong>Elder Signs:</strong> Discard an Elder Sign card and spend 2 Sanity points to permanently close and seal the gate against future openings!</li>
              </ul>
            </div>
          )}

          {activeTab === 'win_lose' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/60 border border-emerald-700 p-3.5 rounded-xl">
                <h4 className="font-serif font-bold text-sm text-emerald-300 mb-1 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-400" /> How to Win
                </h4>
                <p className="text-emerald-100">
                  In game turn 2 and thereafter, <strong>if all dimensional gates are eliminated from the board, the players win!</strong> The surviving investigator who closed the most gates is crowned "First Citizen of Arkham" on the Roll of Honor.
                </p>
              </div>

              <div className="bg-rose-950/60 border border-rose-700 p-3.5 rounded-xl">
                <h4 className="font-serif font-bold text-sm text-rose-300 mb-1 flex items-center gap-1.5">
                  <Skull className="w-4 h-4 text-rose-400" /> How the Game is Lost
                </h4>
                <ul className="list-disc pl-5 mt-1 space-y-1 text-rose-100">
                  <li><strong>Gate Limit Reached:</strong> If 8 gates are simultaneously open on the board (7 gates if 3-4 players, 6 if 5+ players).</li>
                  <li><strong>Doom of Arkham:</strong> If the Doom Factor counter on the Doom Track reaches space 14 ("Doom of Arkham"). Spacetime collapses and the Old Ones awaken!</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#180e0a] p-4 border-t border-[#8c6b45] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#5a3a24] hover:bg-[#734a2e] text-amber-200 font-bold px-5 py-2 rounded-lg text-xs transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
