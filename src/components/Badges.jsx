import React from 'react';
import { useOutages } from '../App.jsx';
import { useProfile } from '../App.jsx';
import { getBadgeStates, getCurrentTier, getStreakData, TIERS } from '../lib/gamification.js';

// ── SVG Badge Designs ─────────────────────────────────────────────────────────

function WatchmanSVG({ size = 80, unlocked }) {
  const c = unlocked ? '#8B95B0' : '#2a2f3e';
  const fill = unlocked ? 'rgba(139,149,176,0.1)' : 'rgba(15,19,30,0.6)';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <polygon points="50,4 93,27.5 93,72.5 50,96 7,72.5 7,27.5"
        fill={fill} stroke={c} strokeWidth="3" />
      <polygon points="50,12 85,31 85,69 50,88 15,69 15,31"
        fill="none" stroke={c} strokeWidth="1" strokeDasharray="3 5" opacity="0.4" />
      {/* Eye whites */}
      <path d="M20,50 Q35,32 50,32 Q65,32 80,50 Q65,68 50,68 Q35,68 20,50Z"
        fill={unlocked ? 'rgba(139,149,176,0.12)' : 'rgba(0,0,0,0.2)'}
        stroke={c} strokeWidth="2" />
      {/* Iris */}
      <circle cx="50" cy="50" r="11" fill={c} opacity={unlocked ? 1 : 0.4} />
      {/* Pupil */}
      <circle cx="50" cy="50" r="5.5" fill={unlocked ? '#0B0F1A' : '#141820'} />
      {/* Gleam */}
      {unlocked && <circle cx="54.5" cy="45.5" r="2.5" fill="rgba(255,255,255,0.55)" />}
      {/* Lashes */}
      {unlocked && <>
        <line x1="29" y1="41" x2="26" y2="38" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="71" y1="41" x2="74" y2="38" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="50" y1="32" x2="50" y2="28" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      </>}
    </svg>
  );
}

function ObserverSVG({ size = 80, unlocked }) {
  const c = unlocked ? '#F5A623' : '#2e2410';
  const fill = unlocked ? 'rgba(245,166,35,0.08)' : 'rgba(15,12,5,0.6)';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="46" stroke={c} strokeWidth="3" fill={fill} />
      <circle cx="50" cy="50" r="38" stroke={c} strokeWidth="1" strokeDasharray="4 5" opacity="0.4" />
      {/* Three tick marks around top */}
      {[[-20, 0], [0, -22], [20, 0]].map(([dx, dy], i) => (
        <g key={i} transform={`translate(${50 + dx * 0.7}, ${50 + dy * 0.7})`}>
          <circle r="3.5" fill={c} opacity={unlocked ? 1 : 0.3} />
        </g>
      ))}
      {/* Flame body */}
      <path d="M50,58 C43,54 40,47 42,40 C44,33 50,28 50,28 C50,28 56,33 58,40 C60,47 57,54 50,58Z"
        stroke={c} strokeWidth="2"
        fill={unlocked ? 'rgba(245,166,35,0.25)' : 'rgba(40,30,0,0.3)'} />
      {/* Flame inner */}
      <path d="M50,54 C46,51 45,46 47,41 C48,38 50,36 50,36 C50,36 52,38 53,41 C55,46 54,51 50,54Z"
        fill={c} opacity={unlocked ? 0.7 : 0.2} />
      {/* Bold "3" */}
      <text x="50" y="82" textAnchor="middle" fontSize="16" fontWeight="900"
        fill={c} opacity={unlocked ? 1 : 0.4}
        style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>3 DAYS</text>
    </svg>
  );
}

function AdvocateSVG({ size = 80, unlocked }) {
  const c = unlocked ? '#60A5FA' : '#1a2540';
  const fill = unlocked ? 'rgba(96,165,250,0.08)' : 'rgba(5,10,25,0.6)';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Shield */}
      <path d="M50,6 L88,22 L88,54 C88,72 70,86 50,94 C30,86 12,72 12,54 L12,22 Z"
        fill={fill} stroke={c} strokeWidth="3" />
      <path d="M50,14 L80,27 L80,54 C80,68 65,80 50,87 C35,80 20,68 20,54 L20,27 Z"
        fill="none" stroke={c} strokeWidth="1" opacity="0.35" />
      {/* Lightning bolt */}
      <path d="M55,20 L42,50 L52,50 L45,80 L63,44 L52,44 Z"
        fill={c} opacity={unlocked ? 0.9 : 0.3} />
      {/* "7" label at bottom */}
      <text x="50" y="96" textAnchor="middle" fontSize="0" fill={c} />
    </svg>
  );
}

function PowerFighterSVG({ size = 80, unlocked }) {
  const c = unlocked ? '#E53935' : '#2a1010';
  const fill = unlocked ? 'rgba(229,57,53,0.08)' : 'rgba(20,5,5,0.6)';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Outer glow ring */}
      <circle cx="50" cy="50" r="46" stroke={c} strokeWidth="3" fill={fill} />
      {/* Inner ring */}
      <circle cx="50" cy="50" r="36" stroke={c} strokeWidth="1" opacity="0.3" />
      {/* Fist shape */}
      <rect x="33" y="42" width="34" height="26" rx="5" fill={c} opacity={unlocked ? 0.85 : 0.25} />
      <rect x="33" y="36" width="8" height="12" rx="4" fill={c} opacity={unlocked ? 0.85 : 0.25} />
      <rect x="43" y="34" width="8" height="14" rx="4" fill={c} opacity={unlocked ? 0.85 : 0.25} />
      <rect x="53" y="36" width="8" height="12" rx="4" fill={c} opacity={unlocked ? 0.85 : 0.25} />
      <rect x="63" y="40" width="4" height="10" rx="2" fill={c} opacity={unlocked ? 0.7 : 0.2} />
      {/* Spark lines */}
      {unlocked && <>
        <line x1="74" y1="28" x2="80" y2="22" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="76" y1="36" x2="84" y2="33" stroke={c} strokeWidth="2" strokeLinecap="round" />
        <line x1="70" y1="22" x2="72" y2="15" stroke={c} strokeWidth="2" strokeLinecap="round" />
      </>}
    </svg>
  );
}

function AllSeeingEyeSVG({ size = 80, unlocked }) {
  const c = unlocked ? '#FFD700' : '#2a2200';
  const c2 = unlocked ? '#00A651' : '#0a1a0a';
  const fill = unlocked ? 'rgba(255,215,0,0.08)' : 'rgba(10,10,0,0.6)';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Outer rays */}
      {unlocked && [0,45,90,135,180,225,270,315].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 50 + Math.cos(rad) * 44;
        const y1 = 50 + Math.sin(rad) * 44;
        const x2 = 50 + Math.cos(rad) * 50;
        const y2 = 50 + Math.sin(rad) * 50;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.6" />;
      })}
      {/* Pyramid / triangle */}
      <polygon points="50,8 90,85 10,85"
        fill={fill} stroke={c} strokeWidth="3" />
      <polygon points="50,16 82,80 18,80"
        fill="none" stroke={c} strokeWidth="1" opacity="0.3" />
      {/* Eye inside triangle */}
      <path d="M28,58 Q40,44 50,44 Q60,44 72,58 Q60,70 50,70 Q40,70 28,58Z"
        fill={unlocked ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,0,0.2)'}
        stroke={c} strokeWidth="1.5" />
      {/* Iris — green accent */}
      <circle cx="50" cy="58" r="9" fill={c2} opacity={unlocked ? 1 : 0.2} />
      {/* Pupil */}
      <circle cx="50" cy="58" r="4.5" fill={unlocked ? '#0B0F1A' : '#050805'} />
      {/* Gold gleam */}
      {unlocked && <circle cx="53.5" cy="54.5" r="2" fill="rgba(255,255,255,0.7)" />}
      {/* Bottom line decoration */}
      <line x1="10" y1="88" x2="90" y2="88" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="92" x2="78" y2="92" stroke={c} strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

const BADGE_SVGS = {
  watchman: WatchmanSVG,
  observer: ObserverSVG,
  advocate: AdvocateSVG,
  power_fighter: PowerFighterSVG,
  all_seeing_eye: AllSeeingEyeSVG,
};

// ── Streak flame display ──────────────────────────────────────────────────────

function StreakDisplay({ streak, todayLogged }) {
  const active = streak > 0;
  return (
    <div
      className="rounded-card px-5 py-4 flex items-center gap-4"
      style={{
        backgroundColor: '#111827',
        border: `1px solid ${active ? 'rgba(245,166,35,0.25)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: active ? '0 0 20px rgba(245,166,35,0.08)' : 'none',
      }}
    >
      <div style={{ fontSize: 40, lineHeight: 1 }}>{streak >= 7 ? '🔥' : streak >= 3 ? '⚡' : '🌑'}</div>
      <div className="flex-1">
        <p
          className="text-3xl font-black tabular-nums leading-none"
          style={{ color: active ? '#F5A623' : '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}
        >
          {streak}
          <span className="text-base ml-1" style={{ color: '#4A5470' }}>day{streak !== 1 ? 's' : ''}</span>
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#4A5470' }}>
          {streak === 0
            ? 'Log today to start your streak'
            : todayLogged
              ? 'Streak active · logged today ✓'
              : 'Streak active · log today to keep it!'}
        </p>
      </div>
      {!todayLogged && streak > 0 && (
        <div
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: 'rgba(245,166,35,0.15)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.3)' }}
        >
          Log today!
        </div>
      )}
    </div>
  );
}

// ── Main Badges page ─────────────────────────────────────────────────────────

export default function Badges({ onBack }) {
  const { outages, confirmations = [] } = useOutages();
  const { profile } = useProfile();

  const complaintsCount = profile?.complaints_filed || 0;
  const { streak, todayLogged } = getStreakData(outages, confirmations);
  const badgeStates = getBadgeStates(outages, complaintsCount, streak);
  const currentTier = getCurrentTier(outages, complaintsCount, streak);

  const unlockedCount = badgeStates.filter(b => b.unlocked).length;

  return (
    <div className="px-4 pt-6 pb-24 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="btn-press w-9 h-9 rounded-btn flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#8B95B0' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div>
          <h1
            className="text-xl font-black text-textPrimary leading-none"
            style={{ fontFamily: 'Syne, system-ui, sans-serif' }}
          >
            Badges
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#4A5470' }}>
            {unlockedCount} of {TIERS.length} collected
          </p>
        </div>
      </div>

      {/* Current rank card */}
      {currentTier ? (
        <div
          className="rounded-card p-5 flex items-center gap-4"
          style={{
            backgroundColor: '#111827',
            border: `1px solid ${currentTier.color}30`,
            boxShadow: `0 0 28px ${currentTier.glow}`,
          }}
        >
          {React.createElement(BADGE_SVGS[currentTier.id], { size: 64, unlocked: true })}
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-0.5" style={{ color: currentTier.color, fontFamily: 'Syne, system-ui, sans-serif' }}>
              Current Rank
            </p>
            <p className="text-lg font-black text-textPrimary" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>
              {currentTier.label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#4A5470' }}>{currentTier.description}</p>
          </div>
        </div>
      ) : (
        <div
          className="rounded-card p-5 text-center"
          style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-2xl mb-2">👁️</p>
          <p className="text-sm font-bold text-textPrimary">No rank yet</p>
          <p className="text-xs mt-1" style={{ color: '#4A5470' }}>Log your first outage to earn the Watchman badge.</p>
        </div>
      )}

      {/* Streak */}
      <div>
        <p
          className="text-xs font-black uppercase tracking-widest mb-3"
          style={{ color: '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}
        >
          Logging Streak
        </p>
        <StreakDisplay streak={streak} todayLogged={todayLogged} />
      </div>

      {/* Badge collection */}
      <div>
        <p
          className="text-xs font-black uppercase tracking-widest mb-3"
          style={{ color: '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}
        >
          All Badges
        </p>
        <div className="flex flex-col gap-3">
          {badgeStates.map((badge) => {
            const BadgeSVG = BADGE_SVGS[badge.id];
            return (
              <div
                key={badge.id}
                className="rounded-card p-4 flex items-center gap-4"
                style={{
                  backgroundColor: badge.unlocked ? '#111827' : 'rgba(17,24,39,0.5)',
                  border: badge.unlocked
                    ? `1px solid ${badge.color}35`
                    : '1px solid rgba(255,255,255,0.04)',
                  boxShadow: badge.unlocked ? `0 0 16px ${badge.glow}` : 'none',
                  opacity: badge.unlocked ? 1 : 0.55,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  <BadgeSVG size={64} unlocked={badge.unlocked} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p
                      className="text-base font-black leading-tight"
                      style={{
                        color: badge.unlocked ? badge.color : '#4A5470',
                        fontFamily: 'Syne, system-ui, sans-serif',
                      }}
                    >
                      {badge.label}
                    </p>
                    {badge.unlocked && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: badge.color + '20', color: badge.color, border: `1px solid ${badge.color}35` }}
                      >
                        Earned
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: badge.unlocked ? '#8B95B0' : '#4A5470' }}>
                    {badge.description}
                  </p>
                  {!badge.unlocked && (
                    <p className="text-xs mt-1 font-semibold" style={{ color: '#4A5470' }}>
                      🔒 {badge.requirement}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-center leading-relaxed" style={{ color: '#4A5470' }}>
        Badges are earned by logging outages consistently and holding your DisCo accountable.
        Every complaint filed puts pressure on them to do better.
      </p>
    </div>
  );
}
