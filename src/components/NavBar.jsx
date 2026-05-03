import React from 'react';
import { Home, List, MapPin, BarChart2, FileText, Shield, Wallet } from 'lucide-react';

const BASE_TABS = [
  { id: 'dashboard', label: 'Home',      Icon: Home },
  { id: 'log',       label: 'Log',       Icon: List },
  { id: 'community', label: 'Community', Icon: MapPin },
  { id: 'analytics', label: 'Stats',     Icon: BarChart2 },
  { id: 'spend',     label: 'Spend',     Icon: Wallet },
  { id: 'report',    label: 'Report',    Icon: FileText },
];

const ADMIN_TAB = { id: 'admin', label: 'Admin', Icon: Shield };

function BadgeDot({ color = '#F39C12' }) {
  return (
    <div
      className="absolute rounded-full"
      style={{
        width: 7, height: 7,
        backgroundColor: color,
        top: 2, right: 2,
        boxShadow: `0 0 0 2px rgba(10,17,33,0.96)`,
      }}
    />
  );
}

export default function NavBar({ currentTab, onTabChange, isAdmin, setupIncomplete, complaintReady }) {
  const TABS = isAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS;

  function hasBadge(id) {
    if (id === 'settings') return setupIncomplete;
    if (id === 'report')   return complaintReady;
    return false;
  }

  // ── Desktop sidebar (lg+) ──────────────────────────────────────────────────
  const desktopSidebar = (
    <nav
      className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40"
      style={{
        width: 220,
        backgroundColor: 'rgba(11,15,26,0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-lg" aria-hidden>⚡</span>
        <span
          style={{
            fontFamily: 'Syne, system-ui, sans-serif',
            fontWeight: 800,
            color: '#F0F4FF',
            fontSize: 15,
            letterSpacing: '-0.01em',
          }}
        >PowerWatch</span>
      </div>

      <div className="flex flex-col gap-1 pt-3 px-2 flex-1">
        {TABS.map(({ id, label, Icon }) => {
          const active = currentTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className="nav-tab relative flex items-center gap-3 w-full px-3 py-2.5 rounded-btn text-left"
              style={{
                color: active ? '#00A651' : '#4A5470',
                backgroundColor: active ? 'rgba(0,166,81,0.1)' : 'transparent',
              }}
              aria-label={label}
            >
              {/* Active left border */}
              {active && (
                <div
                  className="absolute left-0 top-1 bottom-1 rounded-full"
                  style={{ width: 3, backgroundColor: '#00A651' }}
                />
              )}
              <Icon size={18} strokeWidth={active ? 2.5 : 1.7} />
              <span className="text-sm" style={{ fontWeight: active ? 700 : 500 }}>{label}</span>
              {hasBadge(id) && <BadgeDot color={id === 'report' ? '#00A651' : '#F5A623'} />}
            </button>
          );
        })}
      </div>

      <div className="px-2 pb-4">
        <button
          onClick={() => onTabChange('settings')}
          className="nav-tab relative flex items-center gap-3 w-full px-3 py-2.5 rounded-btn text-left"
          style={{
            color: currentTab === 'settings' ? '#00A651' : '#4A5470',
            backgroundColor: currentTab === 'settings' ? 'rgba(0,166,81,0.1)' : 'transparent',
          }}
          aria-label="Settings"
        >
          {currentTab === 'settings' && (
            <div className="absolute left-0 top-1 bottom-1 rounded-full" style={{ width: 3, backgroundColor: '#00A651' }} />
          )}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={currentTab === 'settings' ? 2.5 : 1.7} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span className="text-sm" style={{ fontWeight: currentTab === 'settings' ? 700 : 500 }}>Settings</span>
          {setupIncomplete && <BadgeDot color="#F39C12" />}
        </button>
      </div>
    </nav>
  );

  // ── Mobile bottom tab bar (< lg) ─────────────────────────────────────────
  const mobileBar = (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch px-1"
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
            className="nav-tab flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative"
            style={{ color: active ? '#2ECC71' : '#4B5563' }}
            aria-label={label}
          >
            <div
              className="flex items-center justify-center w-11 h-7 rounded-lg relative"
              style={{
                backgroundColor: active ? 'rgba(46,204,113,0.14)' : 'transparent',
                transition: 'background-color 0.15s ease',
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.7} />
              {hasBadge(id) && <BadgeDot color={id === 'report' ? '#2ECC71' : '#F39C12'} />}
            </div>
            <span className="text-xs tracking-tight" style={{ fontWeight: active ? 700 : 500 }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {desktopSidebar}
      {mobileBar}
    </>
  );
}
