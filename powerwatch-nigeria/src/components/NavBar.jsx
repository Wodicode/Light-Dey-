import React from 'react';
import { Home, List, BarChart2, FileText } from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', Icon: Home },
  { id: 'log',       label: 'Log',       Icon: List },
  { id: 'analytics', label: 'Analytics', Icon: BarChart2 },
  { id: 'report',    label: 'Report',    Icon: FileText },
];

export default function NavBar({ currentTab, onTabChange }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
      style={{ backgroundColor: '#1E293B', borderTop: '1px solid #334155' }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = currentTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors"
            style={{ color: active ? '#2ECC71' : '#94A3B8' }}
            aria-label={label}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
