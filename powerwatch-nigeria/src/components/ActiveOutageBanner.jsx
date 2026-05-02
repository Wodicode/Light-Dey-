import React, { useState, useEffect } from 'react';
import { useOutages } from '../App.jsx';
import { formatElapsedSeconds } from '../lib/calculations.js';

export default function ActiveOutageBanner({ onNavigateToLog }) {
  const { activeOutage } = useOutages();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeOutage) {
      setElapsed(0);
      return;
    }

    const computeElapsed = () => {
      const now = new Date();
      const [startH, startM] = activeOutage.start_time.split(':').map(Number);
      const startDateParts = activeOutage.date.split('-').map(Number);
      const startDate = new Date(startDateParts[0], startDateParts[1] - 1, startDateParts[2], startH, startM, 0);
      const secs = Math.max(0, Math.floor((now - startDate) / 1000));
      setElapsed(secs);
    };

    computeElapsed();
    const interval = setInterval(computeElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeOutage]);

  if (!activeOutage) return null;

  return (
    <button
      onClick={onNavigateToLog}
      className="w-full px-4 py-2.5 text-white text-sm font-semibold text-center banner-pulse flex items-center justify-center gap-2"
      style={{ backgroundColor: '#E74C3C', borderBottom: '1px solid #c0392b' }}
    >
      <span className="w-2 h-2 rounded-full bg-white inline-block animate-pulse" />
      Power outage in progress — {formatElapsedSeconds(elapsed)} — Tap to resolve
    </button>
  );
}
