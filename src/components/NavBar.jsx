import React from 'react';
import { Home, List, MapPin, BarChart2, FileText, Shield } from 'lucide-react';

const BASE_TABS = [
  { id: 'dashboard', label: 'Home',      Icon: Home },
  { id: 'log',       label: 'Log',       Icon: List },
  { id: 'community', label: 'Community', Icon: MapPin },
  { id: 'analytics', label: 'Stats',     Icon: BarChart2 },
  { id: 'report',    label: 'Report',    Icon: FileText },
];

const ADMIN_TAB = { id: 'admin', label: 'Admin', Icon: Shield };

export default function NavBar({ currentTab, onTabChange, isAdmin }) {
  const TABS = isAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS;
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch px-1"
      style={{
        backgroundColor: 'rgba(10,17,33,0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(51,65,85,0.5)',
      }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = currentTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className="nav-tab flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
            style={{ color: active ? '#2ECC71' : '#4B5563' }}
            aria-label={label}
          >
            {/* Icon wrapped in pill */}
            <div
              className="flex items-center justify-center w-11 h-7 rounded-lg"
              style={{
                backgroundColor: active ? 'rgba(46,204,113,0.14)' : 'transparent',
                transition: 'background-color 0.15s ease',
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.7} />
            </div>
            <span
              className="text-xs tracking-tight"
              style={{ fontWeight: active ? 700 : 500 }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
