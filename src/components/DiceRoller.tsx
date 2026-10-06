import React, { useState, useEffect } from 'react';
import { sound } from '../utils/audio';
import { Dices, Footprints, Sparkles, X } from 'lucide-react';

interface DiceRollerProps {
  isOpen: boolean;
  onClose: () => void;
  dice: [number, number];
  title: string;
  description: string;
  canReroll?: boolean;
  onReroll?: () => void;
}

// Render authentic 6-sided die face with classic inset pips
const DieFace: React.FC<{ value: number; isRolling: boolean; delay?: number }> = ({
  value,
  isRolling,
  delay = 0
}) => {
  // Pip positions for standard D6 faces
  const renderPips = (val: number) => {
    switch (val) {
      case 1:
        return (
          <div className="flex items-center justify-center w-full h-full">
            <span className="w-4 h-4 bg-red-700 rounded-full shadow-inner" />
          </div>
        );
      case 2:
        return (
          <div className="flex justify-between w-full h-full p-2.5">
            <span className="w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner self-start" />
            <span className="w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner self-end" />
          </div>
        );
      case 3:
        return (
          <div className="flex justify-between w-full h-full p-2">
            <span className="w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner self-start" />
            <span className="w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner self-center" />
            <span className="w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner self-end" />
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-2 gap-3 p-2.5 w-full h-full">
            <span className="w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner" />
            <span className="w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner justify-self-end" />
            <span className="w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner self-end" />
            <span className="w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner self-end justify-self-end" />
          </div>
        );
      case 5:
        return (
          <div className="relative w-full h-full p-2">
            <span className="absolute top-2.5 left-2.5 w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner" />
            <span className="absolute top-2.5 right-2.5 w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner" />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner" />
            <span className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner" />
            <span className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner" />
          </div>
        );
      case 6:
        return (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 p-2 w-full h-full items-center">
            <span className="w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner" />
            <span className="w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner justify-self-end" />
            <span className="w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner" />
            <span className="w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner justify-self-end" />
            <span className="w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner" />
            <span className="w-3.5 h-3.5 bg-stone-900 rounded-full shadow-inner justify-self-end" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`relative w-20 h-20 bg-gradient-to-br from-amber-50 via-stone-100 to-amber-100 rounded-2xl border-4 border-[#8c6541] shadow-2xl flex items-center justify-center transition-all transform ${
        isRolling
          ? 'animate-bounce rotate-12 scale-110'
          : 'hover:scale-105 hover:rotate-1'
      }`}
      style={{
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.8), 0 10px 20px rgba(0,0,0,0.6)',
        animationDuration: '0.35s',
        animationDelay: `${delay}ms`
      }}
    >
      {/* Specular corner highlight */}
      <div className="absolute top-1 left-1 w-3 h-3 bg-white/70 rounded-full blur-[1px]" />
      {renderPips(value)}
    </div>
  );
};

export const DiceRoller: React.FC<DiceRollerProps> = ({
  isOpen,
  onClose,
  dice,
  title,
  description,
  canReroll,
  onReroll
}) => {
  const [isRolling, setIsRolling] = useState(false);
  const [displayDice, setDisplayDice] = useState<[number, number]>(dice);

  useEffect(() => {
    if (isOpen) {
      setIsRolling(true);
      sound.playDiceRoll();

      // Rapidly flicker dice values during rolling animation
      const interval = setInterval(() => {
        setDisplayDice([
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1
        ]);
      }, 70);

      const timer = setTimeout(() => {
        clearInterval(interval);
        setDisplayDice(dice);
        setIsRolling(false);
      }, 600);

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, [isOpen, dice[0], dice[1]]);

  if (!isOpen) return null;

  const sum = displayDice[0] + displayDice[1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#25180f] border-4 border-[#a27b4e] rounded-2xl p-6 shadow-2xl text-[#f5ecd8]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-stone-400 hover:text-amber-300 p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center pb-4 border-b border-[#5c3e27]">
          <div className="inline-flex items-center gap-2 text-amber-400 font-serif font-bold text-xl uppercase tracking-wider">
            <Dices className="w-6 h-6" /> {title}
          </div>
          <p className="text-xs text-amber-200/80 mt-1">{description}</p>
        </div>

        {/* Felt Dice Tray */}
        <div className="my-6 p-6 bg-gradient-to-b from-[#133e26] to-[#0d2a1a] rounded-xl border-4 border-[#5a3a22] shadow-inner flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-8">
            <DieFace value={displayDice[0]} isRolling={isRolling} delay={0} />
            <span className="text-3xl font-serif font-bold text-amber-300">+</span>
            <DieFace value={displayDice[1]} isRolling={isRolling} delay={100} />
          </div>

          {/* Result Badge */}
          <div className="mt-6 flex items-center gap-2 bg-[#2d1c12] px-5 py-2 rounded-full border-2 border-amber-500 shadow-lg">
            <Footprints className="w-5 h-5 text-amber-400" />
            <span className="text-lg font-serif font-bold text-white tracking-wide">
              {isRolling ? 'Rolling...' : `TOTAL: ${sum} SPACES`}
            </span>
          </div>
        </div>

        {/* Board Game Movement Guide */}
        <div className="bg-[#1a110a] p-3.5 rounded-lg border border-[#4a321e] text-xs text-stone-300 space-y-1.5 mb-5">
          <p className="font-semibold text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> How Movement Works:
          </p>
          <p>
            • Click any adjacent <strong>white road circle</strong> to step forward 1 space at a time.
          </p>
          <p>
            • Or click any highlighted space up to <strong>{sum}</strong> spaces away along the street to walk there.
          </p>
          <p>
            • Stop on an <strong>empty space</strong> to rest, or enter a <strong>named location</strong> to draw an Arkham Gazette encounter!
          </p>
        </div>

        {/* Action Button */}
        <div className="flex gap-3">
          {canReroll && (
            <button
              onClick={onReroll}
              disabled={isRolling}
              className="flex-1 bg-[#4a3420] hover:bg-[#5c4129] text-amber-200 font-bold py-2.5 px-4 rounded-xl border border-[#7a5433] transition"
            >
              Reroll Dice
            </button>
          )}
          <button
            onClick={onClose}
            disabled={isRolling}
            className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-serif font-bold text-base py-2.5 px-4 rounded-xl shadow-lg transition active:scale-95"
          >
            Move Plastic Piece ({sum} Moves)
          </button>
        </div>
      </div>
    </div>
  );
};
