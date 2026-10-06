import React from 'react';
import { LOCATIONS_DATA } from '../data/rules1987';
import { getNodeForLocation } from '../data/boardGraph';
import { Car, X, MapPin } from 'lucide-react';

interface TaxiModalProps {
  isOpen: boolean;
  onSelectDestination: (nodeId: string) => void;
  onClose: () => void;
}

export const TaxiModal: React.FC<TaxiModalProps> = ({
  isOpen,
  onSelectDestination,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#241710] text-[#f5ecd8] border-3 border-amber-600 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950 via-[#3d2510] to-amber-950 p-4 border-b border-amber-600/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-amber-200">
                Arkham Yellow Cab Service
              </h3>
              <p className="text-xs text-amber-300">
                Fare: $1 — Quick transit directly to any location or taxi stand in Arkham!
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div>
            <h4 className="text-xs font-serif font-bold text-amber-300 uppercase tracking-wider mb-2">
              Select Arkham Location:
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(LOCATIONS_DATA).map(loc => {
                const targetNodeId = getNodeForLocation(loc.id) || loc.id;
                return (
                  <button
                    key={loc.id}
                    onClick={() => onSelectDestination(targetNodeId)}
                    className="bg-[#311f13] hover:bg-amber-900/60 border border-[#6b472a] hover:border-amber-500 p-2.5 rounded-lg text-left transition flex items-center gap-2 text-xs group"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition shrink-0" />
                    <span className="font-medium text-[#f5ecd8] truncate">{loc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-serif font-bold text-amber-300 uppercase tracking-wider mb-2">
              Or Direct To Taxi Stand:
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onSelectDestination('TAXI_W')}
                className="bg-[#311f13] hover:bg-amber-900/60 border border-[#6b472a] hover:border-amber-500 p-2 rounded-lg text-xs font-medium text-amber-200 text-center transition"
              >
                West Taxi Stand
              </button>
              <button
                onClick={() => onSelectDestination('TAXI_S')}
                className="bg-[#311f13] hover:bg-amber-900/60 border border-[#6b472a] hover:border-amber-500 p-2 rounded-lg text-xs font-medium text-amber-200 text-center transition"
              >
                South Taxi Stand
              </button>
              <button
                onClick={() => onSelectDestination('TAXI_E')}
                className="bg-[#311f13] hover:bg-amber-900/60 border border-[#6b472a] hover:border-amber-500 p-2 rounded-lg text-xs font-medium text-amber-200 text-center transition"
              >
                East Taxi Stand
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#180e0a] p-3 border-t border-[#8c6b45] flex justify-end">
          <button
            onClick={onClose}
            className="text-xs text-stone-400 hover:text-white px-4 py-1.5 transition"
          >
            Cancel Taxi
          </button>
        </div>
      </div>
    </div>
  );
};
