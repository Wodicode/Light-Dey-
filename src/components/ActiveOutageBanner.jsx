import React, { useState, useEffect } from 'react';
import { useOutages } from '../App.jsx';
import { formatElapsedSeconds } from '../lib/calculations.js';

export default function ActiveOutageBanner({ onNavigateToLog }) {
  const { activeOutage } = useOutages();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeOutage) { setElapsed(0); return; }
    const compute = () => {
      const now = new Date();
      const [h, m] = activeOutage.start_time.split(':').map(Number);
      const parts = activeOutage.date.split('-').map(Number);
      const start = new Date(parts[0], parts[1] - 1, parts[2], h, m, 0);
      setElapsed(Math.max(0, Math.floor((now - start) / 1000)));
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [activeOutage]);

  if (!activeOutage) return null;

  return (
    <button
      onClick={onNavigateToLog}
      className="banner-pulse w-full flex items-center justify-between px-4 py-2.5 active:opacity-75 transition-opacity"
      style={{
        background: 'linear-gradient(90deg, #c0392b 0%, #e74c3c 50%, #c0392b 100%)',
        borderBottom: '1px solid rgba(0,0,0,0.25)',
        boxShadow: '0 2px 16px rgba(231,76,60,0.35)',
      }}
    >
      {/* Left: status label */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="blink w-1.5 h-1.5 rounded-full bg-white" />
        <span className="text-xs font-bold text-white uppercase tracking-widest">Live</span>
      </div>

      {/* Centre: elapsed */}
      <span className="text-sm font-black text-white tabular-nums tracking-tight">
        {formatElapsedSeconds(elapsed)}
      </span>

      {/* Right: CTA */}
      <span className="text-xs font-semibold text-white/75 shrink-0">
        Resolve →
      </span>
    </button>
  );
}
