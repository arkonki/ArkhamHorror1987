import React, { useRef, useEffect } from 'react';
import { LogMessage } from '../types/game';
import { Scroll, Terminal, ShieldAlert, Sparkles, Skull } from 'lucide-react';

interface LogPanelProps {
  logs: LogMessage[];
}

export const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-[#1c130d] text-[#e8dac1] border-2 border-[#69482b] rounded-xl p-3 shadow-lg flex flex-col h-64">
      <div className="flex items-center justify-between pb-2 border-b border-[#4d321d] mb-2">
        <span className="font-serif font-bold text-xs text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
          <Scroll className="w-3.5 h-3.5 text-amber-500" /> Arkham Chronicle & Mythos Log
        </span>
        <span className="text-[10px] text-[#9c7d61] font-mono">
          {logs.length} entries recorded
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px] leading-relaxed">
        {logs.map(log => {
          let badgeColor = 'text-stone-400';
          let icon = null;

          if (log.type === 'mythos') {
            badgeColor = 'text-red-400';
            icon = <Skull className="w-3 h-3 text-red-500 inline mr-1 shrink-0" />;
          } else if (log.type === 'combat') {
            badgeColor = 'text-rose-300';
            icon = <ShieldAlert className="w-3 h-3 text-rose-400 inline mr-1 shrink-0" />;
          } else if (log.type === 'event') {
            badgeColor = 'text-amber-300';
            icon = <Sparkles className="w-3 h-3 text-amber-400 inline mr-1 shrink-0" />;
          }

          return (
            <div key={log.id} className="p-1.5 rounded bg-[#251912]/60 border border-[#3d2716]/40 flex gap-2 items-start">
              <span className="text-[9px] text-[#85664d] bg-[#160c07] px-1 py-0.5 rounded shrink-0">
                {log.timestamp}
              </span>
              <p className={`flex-1 ${badgeColor}`}>
                {icon}
                {log.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
