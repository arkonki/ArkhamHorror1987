import React, { useState } from 'react';
import { Investigator, Monster, Card } from '../types/game';
import { rollD6, getEffectiveStats } from '../game/engine';
import { sound } from '../utils/audio';
import { Skull, Shield, Brain, Sword, Sparkles, Footprints, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface CombatModalProps {
  investigator: Investigator;
  monster: Monster;
  onVictory: (monster: Monster) => void;
  onFlee: () => void;
  onDefeat: (cause: 'strength' | 'sanity') => void;
  onUpdateInvestigator: (updated: Investigator) => void;
}

export const CombatModal: React.FC<CombatModalProps> = ({
  investigator,
  monster,
  onVictory,
  onFlee,
  onDefeat,
  onUpdateInvestigator
}) => {
  const [stage, setStage] = useState<'sanity' | 'action_choice' | 'fight' | 'resolved' | 'ko'>('sanity');
  const [koCause, setKoCause] = useState<'strength' | 'sanity'>('strength');
  const [sanityResult, setSanityResult] = useState<{ roll: number; passed: boolean; loss: number } | null>(null);
  const [sneakResult, setSneakResult] = useState<{ roll: number; passed: boolean } | null>(null);
  
  // Fight equipment choices
  const [selectedWeaponIds, setSelectedWeaponIds] = useState<string[]>([]);
  const [selectedSpellIds, setSelectedSpellIds] = useState<string[]>([]);
  const [fightResult, setFightResult] = useState<{
    dieRoll: number;
    skillBonus: number;
    weaponBonus: number;
    spellBonus: number;
    total: number;
    monsterSP: number;
    victory: boolean;
    damageTaken?: number;
  } | null>(null);

  // Available weapons & spells
  const stats = getEffectiveStats(investigator);
  const weapons = investigator.items.filter(i => (i.fightBonus || 0) > 0);
  const combatSpells = investigator.spells.filter(s => (s.magicBonus || 0) > 0);
  const magicOnly = !!monster.specialRules?.some(r => /only magic|magic attacks only/i.test(r));
  const gunImmune = !!monster.specialRules?.some(r => /unharmed by guns/i.test(r));
  const cannotSneak = !!monster.specialRules?.includes('Cannot be Sneaked past');
  const hasMists = investigator.spells.some(s => s.specialEffect === 'auto_sneak');
  const weaponWorks = (w: Card) => !(magicOnly && !w.isMagical) && !(gunImmune && w.isGun);
  const spellCostSelected = selectedSpellIds.reduce(
    (sum, id) => sum + (investigator.spells.find(s => s.id === id)?.sanityCost || 0),
    0
  );

  // Step 1: Sanity Check
  const handleSanityRoll = () => {
    sound.playDiceRoll();
    const roll = rollD6();
    const passed = roll <= investigator.sanity;
    const loss = passed ? monster.sanityCheck.passLoss : monster.sanityCheck.failLoss;
    const newSanity = Math.max(0, investigator.sanity - loss);

    setSanityResult({ roll, passed, loss });

    const updated = { ...investigator, sanity: newSanity };
    onUpdateInvestigator(updated);

    if (newSanity <= 0) {
      sound.playCombatStrike(false);
      setKoCause('sanity');
      setStage('ko');
    } else {
      setStage('action_choice');
    }
  };

  // Step 2: Sneak Roll
  const handleSneakRoll = () => {
    sound.playDiceRoll();
    const roll = hasMists ? 1 : rollD6();
    const passed = hasMists || roll <= stats.sneak;
    setSneakResult({ roll, passed });
    if (stage !== 'action_choice') setStage('action_choice');

    if (passed) {
      sound.playStep();
      setTimeout(() => {
        onFlee();
      }, 900);
    } else {
      setTimeout(() => {
        setSneakResult(null);
        setStage('fight');
      }, 1100);
    }
  };

  // Toggle weapon selection (Enforce 2 hands max: 2x 1H or 1x 2H)
  const toggleWeapon = (weapon: Card) => {
    if (selectedWeaponIds.includes(weapon.id)) {
      setSelectedWeaponIds(prev => prev.filter(id => id !== weapon.id));
      return;
    }

    const currentHandsUsed = selectedWeaponIds.reduce((sum, id) => {
      const w = investigator.items.find(item => item.id === id);
      return sum + (w?.hands || 1);
    }, 0);

    const neededHands = weapon.hands || 1;
    if (currentHandsUsed + neededHands > 2) {
      // Cannot equip more than 2 hands of weapons
      return;
    }

    setSelectedWeaponIds(prev => [...prev, weapon.id]);
  };

  const toggleSpell = (spell: Card) => {
    if (selectedSpellIds.includes(spell.id)) {
      setSelectedSpellIds(prev => prev.filter(id => id !== spell.id));
    } else if (spellCostSelected + (spell.sanityCost || 0) < investigator.sanity) {
      setSelectedSpellIds(prev => [...prev, spell.id]);
    }
  };

  // Step 3: Combat Attack Roll
  const handleAttackRoll = () => {
    sound.playDiceRoll();
    const dieRoll = rollD6();
    const skillBonus = magicOnly ? 0 : stats.fight;

    const weaponBonus = selectedWeaponIds.reduce((sum, id) => {
      const w = investigator.items.find(item => item.id === id);
      return sum + (w && weaponWorks(w) ? w.fightBonus || 0 : 0);
    }, 0);

    const spellBonus = selectedSpellIds.reduce((sum, id) => {
      const s = investigator.spells.find(spell => spell.id === id);
      return sum + (s?.magicBonus || 0);
    }, 0);

    const total = dieRoll + skillBonus + weaponBonus + spellBonus;
    const victory = total >= monster.strength;

    sound.playCombatStrike(victory);

    // Casting costs sanity
    let current = investigator;
    if (spellCostSelected > 0) {
      current = { ...investigator, sanity: Math.max(1, investigator.sanity - spellCostSelected) };
      onUpdateInvestigator(current);
    }

    if (victory) {
      setFightResult({
        dieRoll,
        skillBonus,
        weaponBonus,
        spellBonus,
        total,
        monsterSP: monster.strength,
        victory: true
      });
      setStage('resolved');
    } else {
      // Monster counterattacks with D6 strength damage
      const damageTaken = rollD6();
      const newStrength = Math.max(0, current.strength - damageTaken);

      const updated = { ...current, strength: newStrength };
      onUpdateInvestigator(updated);

      setFightResult({
        dieRoll,
        skillBonus,
        weaponBonus,
        spellBonus,
        total,
        monsterSP: monster.strength,
        victory: false,
        damageTaken
      });

      if (newStrength <= 0) {
        setKoCause('strength');
        setStage('ko');
      } else {
        setStage('resolved');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true">
      <div className="bg-[#241710] text-[#f5ecd8] border-3 border-[#8c6b45] rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950 via-[#3d1b14] to-red-950 p-4 border-b border-[#8c6b45] flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400 font-serif font-bold text-xl">
            <Skull className="w-6 h-6 text-red-500 animate-pulse" />
            {investigator.name} vs {monster.name}
          </div>
          <span className="text-xs bg-red-950/80 border border-red-700 text-red-300 px-2.5 py-1 rounded-full font-bold">
            SP: {monster.strength}
          </span>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Monster Card Display */}
          <div className="bg-[#1b100a] p-4 rounded-xl border border-[#5c3e29] flex items-center gap-4">
            <div className="w-18 h-18 bg-red-950/90 border-2 border-red-600 rounded-lg flex flex-col items-center justify-center text-center p-1 shadow-inner">
              <Skull className="w-8 h-8 text-red-400" />
              <span className="text-[10px] text-amber-200 font-bold uppercase mt-1">
                {monster.isFlyer ? 'Flyer' : monster.handedness ? `Turn: ${monster.handedness}` : 'Walk'}
              </span>
            </div>

            <div className="flex-1 space-y-1">
              <h4 className="font-serif font-bold text-lg text-amber-200">{monster.name}</h4>
              <p className="text-xs text-[#c4aa8f]">
                Sanity Horror: <strong className="text-blue-300">SAN {monster.sanityCheck.passLoss}/{monster.sanityCheck.failLoss}</strong> | Strength Defense: <strong className="text-rose-400">{monster.strength} SP</strong>
              </p>
              {monster.specialRules && monster.specialRules.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {monster.specialRules.map((rule, idx) => (
                    <span key={idx} className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.5 rounded">
                      {rule}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* STAGE 1: SANITY CHECK */}
          {/* ======================================================== */}
          {stage === 'sanity' && (
            <div className="bg-[#2d1f15] p-4 rounded-xl border border-[#7a573b] space-y-3">
              <h5 className="font-serif font-bold text-base text-blue-300 flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-400" /> 1. Confront the Horror (Sanity Check)
              </h5>
              <p className="text-xs text-[#d1bea8] leading-relaxed">
                Before attacking or evading, you must test your mental fortitude against the sight of this beast.
                Roll D6 ≤ current Sanity ({investigator.sanity}). Pass: lose {monster.sanityCheck.passLoss} · Fail: lose {monster.sanityCheck.failLoss}.
              </p>

              <button
                autoFocus
                onClick={handleSanityRoll}
                className="w-full bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-2.5 rounded-lg shadow-lg transition flex items-center justify-center gap-2"
              >
                <Brain className="w-5 h-5" /> Roll Sanity Check (D6)
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* STAGE 2: CHOICE - SNEAK OR FIGHT */}
          {/* ======================================================== */}
          {stage === 'action_choice' && (
            <div className="bg-[#2d1f15] p-4 rounded-xl border border-[#7a573b] space-y-3">
              {sanityResult && (
                <div className={`p-2.5 rounded text-xs flex items-center gap-2 ${
                  sanityResult.passed ? 'bg-emerald-950/70 border border-emerald-700 text-emerald-200' : 'bg-rose-950/70 border border-rose-700 text-rose-200'
                }`}>
                  {sanityResult.passed ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                  Sanity roll was <strong>{sanityResult.roll}</strong> ({sanityResult.passed ? 'Passed!' : 'Failed!'}). Lost {sanityResult.loss} Sanity.
                </div>
              )}

              <h5 className="font-serif font-bold text-base text-amber-200 flex items-center gap-2">
                <Sword className="w-5 h-5 text-amber-400" /> 2. Choose Your Response
              </h5>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={handleSneakRoll}
                  disabled={cannotSneak || !!sneakResult}
                  className="bg-[#422c1b] hover:bg-[#593c25] border border-[#a16207] text-amber-200 font-bold p-3 rounded-lg text-sm flex flex-col items-center gap-1 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Footprints className="w-5 h-5 text-amber-400" />
                  <span>Attempt Sneak</span>
                  <span className="text-[10px] text-[#caa888] font-normal">
                    {cannotSneak ? 'This horror cannot be evaded' : hasMists ? "Mists of R'lyeh: automatic success" : `Roll D6 ≤ Sneak (${stats.sneak})`}
                  </span>
                </button>

                <button
                  onClick={() => setStage('fight')}
                  disabled={!!sneakResult}
                  className="disabled:opacity-50 bg-red-800 hover:bg-red-700 border border-red-500 text-white font-bold p-3 rounded-lg text-sm flex flex-col items-center gap-1 shadow-md transition"
                >
                  <Sword className="w-5 h-5 text-red-300" />
                  <span>Engage in Combat</span>
                  <span className="text-[10px] text-red-200 font-normal">Fight with weapons & spells</span>
                </button>
              </div>

              {sneakResult && (
                <div className={`p-2.5 rounded text-xs flex items-center gap-2 ${
                  sneakResult.passed ? 'bg-emerald-950 border border-emerald-700 text-emerald-300' : 'bg-rose-950 border border-rose-700 text-rose-300'
                }`}>
                  Sneak roll: {sneakResult.roll}. {sneakResult.passed ? 'Success! Slipped past into safety.' : 'Failed! The monster corners you to fight!'}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* STAGE 3: FIGHT PREPARATION & ATTACK ROLL */}
          {/* ======================================================== */}
          {stage === 'fight' && (
            <div className="bg-[#2d1f15] p-4 rounded-xl border border-[#7a573b] space-y-4">
              <h5 className="font-serif font-bold text-base text-amber-200 flex items-center gap-2">
                <Sword className="w-5 h-5 text-rose-400" /> 3. Ready Weapons & Spells
              </h5>

              {/* Weapon Selection */}
              <div>
                <label className="text-xs font-bold text-[#e0cbaf] block mb-1.5">
                  Select Weapons (Max 2 Hands):
                </label>
                <div className="flex flex-wrap gap-2">
                  {weapons.map(weapon => {
                    const isSelected = selectedWeaponIds.includes(weapon.id);
                    const works = weaponWorks(weapon);
                    return (
                      <button
                        key={weapon.id}
                        type="button"
                        title={works ? weapon.description : 'Useless against this monster'}
                        disabled={!works}
                        onClick={() => toggleWeapon(weapon)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition ${
                          isSelected
                            ? 'bg-amber-600 border-amber-300 text-white shadow'
                            : 'bg-[#1e130b] border-[#6b4729] text-[#d6bda4] hover:border-amber-500'
                        } disabled:opacity-40 disabled:line-through disabled:cursor-not-allowed`}
                      >
                        <Sword className="w-3.5 h-3.5" />
                        <span>{weapon.name}</span>
                        <span className="text-[10px] bg-black/30 px-1 rounded">+{weapon.fightBonus}</span>
                        <span className="text-[9px] opacity-75">({weapon.hands || 1}H)</span>
                      </button>
                    );
                  })}
                  {weapons.length === 0 && (
                    <span className="text-xs text-neutral-400 italic">No weapons in hand (Fighting unarmed)</span>
                  )}
                </div>
              </div>

              {/* Spells Selection */}
              {combatSpells.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-purple-300 block mb-1.5">
                    Cast Combat Spells:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {combatSpells.map(spell => {
                      const isSelected = selectedSpellIds.includes(spell.id);
                      return (
                        <button
                          key={spell.id}
                          type="button"
                          title={spell.description}
                          onClick={() => toggleSpell(spell)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition ${
                            isSelected
                              ? 'bg-purple-700 border-purple-300 text-white shadow'
                              : 'bg-[#1e130b] border-[#5e2e85] text-purple-200 hover:border-purple-400'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                          <span>{spell.name}</span>
                          <span className="text-[10px] bg-black/30 px-1 rounded">+{spell.magicBonus}</span>
                          {!!spell.sanityCost && <span className="text-[9px] text-blue-200">−{spell.sanityCost} SAN</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Attack Action Button */}
              <button
                onClick={handleAttackRoll}
                className="w-full bg-gradient-to-r from-red-700 to-rose-800 hover:from-red-600 hover:to-rose-700 text-white font-bold py-3 rounded-xl shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2 text-base"
              >
                <Sword className="w-5 h-5" /> Strike! (D6 + {magicOnly ? 0 : stats.fight} + {
                  selectedWeaponIds.reduce((sum, id) => {
                    const w = investigator.items.find(item => item.id === id);
                    return sum + (w && weaponWorks(w) ? w.fightBonus || 0 : 0);
                  }, 0) +
                  selectedSpellIds.reduce((sum, id) => sum + (investigator.spells.find(sp => sp.id === id)?.magicBonus || 0), 0)
                } vs {monster.strength})
              </button>
              {magicOnly && (
                <p className="text-[11px] text-purple-300">Only magic harms this horror — your Fight skill and mundane weapons do not count.</p>
              )}
              {spellCostSelected > 0 && (
                <p className="text-[11px] text-blue-300">Casting will cost {spellCostSelected} Sanity.</p>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* STAGE 4: RESOLUTION */}
          {/* ======================================================== */}
          {stage === 'ko' && (
            <div className="p-4 rounded-xl border bg-rose-950/80 border-rose-600 text-rose-100 space-y-3">
              <div className="flex items-center gap-2 font-serif font-bold text-lg">
                <XCircle className="w-6 h-6 text-rose-400" />
                {koCause === 'sanity' ? 'Your mind shatters!' : 'You collapse from your wounds!'}
              </div>
              {sanityResult && koCause === 'sanity' && (
                <p className="text-xs">Sanity roll {sanityResult.roll} — lost {sanityResult.loss} Sanity.</p>
              )}
              {fightResult && koCause === 'strength' && (
                <p className="text-xs">
                  Attack total {fightResult.total} vs {fightResult.monsterSP}. The monster dealt {fightResult.damageTaken} damage.
                </p>
              )}
              <p className="text-xs text-rose-200">
                {koCause === 'sanity' ? 'You will wake in Arkham Sanitarium with 1 Sanity and lose a spell.' : "You will wake in St. Mary's Hospital with 1 Strength and lose an item."}
              </p>
              <div className="flex justify-end">
                <button
                  autoFocus
                  onClick={() => onDefeat(koCause)}
                  className="bg-rose-700 hover:bg-rose-600 text-white font-bold px-4 py-2 rounded-lg shadow transition"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {stage === 'resolved' && fightResult && (
            <div className={`p-4 rounded-xl border space-y-3 ${
              fightResult.victory ? 'bg-emerald-950/80 border-emerald-600 text-emerald-100' : 'bg-rose-950/80 border-rose-600 text-rose-100'
            }`}>
              <div className="flex items-center gap-2 font-serif font-bold text-lg">
                {fightResult.victory ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-emerald-400" /> VICTORY! Horror Banished!
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-6 h-6 text-rose-400" /> DEFEAT! Horrific Retaliation!
                  </>
                )}
              </div>

              <div className="bg-black/30 p-2.5 rounded text-xs space-y-1">
                <p>
                  Roll ({fightResult.dieRoll}) + Fight ({fightResult.skillBonus}) + Weapons (+{fightResult.weaponBonus}) + Spells (+{fightResult.spellBonus}) = <strong className="text-base text-white">{fightResult.total}</strong>
                </p>
                <p>
                  Required to defeat: <strong>{fightResult.monsterSP} SP</strong>
                </p>
                {!fightResult.victory && (
                  <p className="text-rose-300 mt-1 font-semibold">
                    The monster retaliates! You suffered {fightResult.damageTaken} damage to your Strength!
                  </p>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                {fightResult.victory ? (
                  <button
                    autoFocus
                    onClick={() => onVictory(monster)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg shadow transition"
                  >
                    Claim Monster Trophy
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-2 justify-end">
                    {!cannotSneak && (
                      <button
                        onClick={handleSneakRoll}
                        className="bg-[#422c1b] hover:bg-[#593c25] border border-[#a16207] text-amber-200 font-bold px-4 py-2 rounded-lg shadow transition"
                      >
                        Try to Sneak Away
                      </button>
                    )}
                    <button
                      autoFocus
                      onClick={() => setStage('fight')}
                      className="bg-amber-700 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-lg shadow transition"
                    >
                      Fight Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
