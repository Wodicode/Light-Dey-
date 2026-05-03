import React, { useState, useEffect, useMemo } from 'react';
import { useProfile, useOutages } from '../App.jsx';
import {
  BAND_CONFIG,
  REGULATORY_TRIGGERS,
  buildOutageMap,
  isDayThresholdMet,
  getCurrentConsecutiveMissedStreak,
  getLongestConsecutiveMissedStreak,
  getDaysInCurrentMonth,
  getMonthlyStats,
  getComplaintReadiness,
  todayStr,
  formatDuration,
} from '../lib/calculations.js';
import { getStreakData, getCurrentTier } from '../lib/gamification.js';

// ── Stat card with colored top accent bar ────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  const c = color || '#4A5470';
  return (
    <div
      className="rounded-card p-4 flex flex-col gap-1 overflow-hidden relative card-hover"
      style={{
        backgroundColor: '#111827',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Colored accent stripe */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: '2px', backgroundColor: c, opacity: 0.9 }}
      />
      <p className="text-xs font-semibold uppercase tracking-widest mt-0.5" style={{ color: '#4A5470' }}>
        {label}
      </p>
      <p
        className="text-3xl font-black tabular-nums leading-none tracking-tight"
        style={{ color: c, fontFamily: 'Syne, system-ui, sans-serif' }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-0.5" style={{ color: '#4A5470' }}>{sub}</p>
      )}
    </div>
  );
}

// ── Alert box with left-border accent + icon ─────────────────────────────────
function AlertBox({ color, title, children }) {
  const cfg = {
    amber: { bg: 'rgba(245,166,35,0.06)',  border: '#F5A623', text: '#fbbf24', dim: '#78450a' },
    red:   { bg: 'rgba(229,57,53,0.06)',   border: '#E53935', text: '#fca5a5', dim: '#7f1d1d' },
    green: { bg: 'rgba(0,166,81,0.06)',    border: '#00A651', text: '#6ee7a0', dim: '#14532d' },
  };
  const c = cfg[color] || cfg.amber;
  return (
    <div
      className="rounded-r-card py-3 pr-4 pl-4"
      style={{
        backgroundColor: c.bg,
        borderLeft: `3px solid ${c.border}`,
        boxShadow: `0 0 0 1px ${c.border}18`,
      }}
    >
      {title && (
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: c.border }}>
          {title}
        </p>
      )}
      <p className="text-xs leading-relaxed" style={{ color: c.text }}>{children}</p>
    </div>
  );
}

// ── Shimmer skeleton ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-card p-4 overflow-hidden relative" style={{ backgroundColor: '#111827' }}>
      <div className="skeleton h-2 w-16 mb-3" />
      <div className="skeleton h-8 w-20 mb-2" />
      <div className="skeleton h-2 w-24" />
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ children, badge, badgeColor }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-black uppercase tracking-widest" style={{ color: '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}>
        {children}
      </h2>
      {badge && (
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: badgeColor + '18',
            color: badgeColor,
            border: `1px solid ${badgeColor}35`,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

function currentMonthName() {
  return new Date().toLocaleDateString('en-NG', { month: 'long' });
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Dashboard({ onViewBadges }) {
  const { profile } = useProfile();
  const { outages, outagesLoading, activeOutage, confirmations } = useOutages();

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!activeOutage) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [activeOutage]);

  const band = profile?.service_band || 'A';
  const config = BAND_CONFIG[band] || BAND_CONFIG['A'];

  const outageMap = useMemo(() => buildOutageMap(outages), [outages, tick]);

  // Today
  const todayOutageMins = outageMap[todayStr()] || 0;
  const todaySupplyHours = (24 * 60 - todayOutageMins) / 60;
  const todayMet = isDayThresholdMet(band, todayOutageMins);
  const todayShortfall = Math.max(0, config.minHoursPerDay - todaySupplyHours);

  let todayStatusColor = '#00A651';
  let todayStatusLabel = 'On Track';
  if (!todayMet) {
    const shortfallPct = todayShortfall / config.minHoursPerDay;
    if (shortfallPct > 0.10) { todayStatusColor = '#E53935'; todayStatusLabel = 'Below Threshold'; }
    else { todayStatusColor = '#F5A623'; todayStatusLabel = 'Near Threshold'; }
  }

  // Monthly
  const monthStats = useMemo(() => getMonthlyStats(outageMap, band), [outageMap, band]);
  const startOfMonth = new Date();
  startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
  const today = new Date();

  const currentStreak = useMemo(
    () => getCurrentConsecutiveMissedStreak(outageMap, band), [outageMap, band]
  );
  const longestStreak = useMemo(
    () => getLongestConsecutiveMissedStreak(outageMap, band, startOfMonth, today), [outageMap, band]
  );
  const complaintReadiness = useMemo(
    () => getComplaintReadiness(outageMap, band), [outageMap, band]
  );

  const { streak, todayLogged } = useMemo(
    () => getStreakData(outages, confirmations || []),
    [outages, confirmations]
  );
  const currentTier = useMemo(
    () => getCurrentTier(outages, profile?.complaints_filed || 0, streak),
    [outages, profile?.complaints_filed, streak]
  );

  if (outagesLoading) {
    return (
      <div className="px-4 py-5 flex flex-col gap-8">
        {['Today', 'This Month'].map(s => (
          <div key={s}>
            <div className="skeleton h-3 w-20 mb-4" />
            <div className="grid grid-cols-2 gap-3">
              <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="px-4 py-5 flex flex-col gap-8">
      {!profile && (
        <AlertBox color="amber" title="Setup required">
          Complete your profile in Settings to personalise thresholds and generate complaint letters.
        </AlertBox>
      )}

      {/* ── Today ── */}
      <section>
        <SectionHeading badge={todayStatusLabel} badgeColor={todayStatusColor}>
          Today
        </SectionHeading>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <StatCard
            label="Supply"
            value={`${todaySupplyHours.toFixed(1)}h`}
            sub={`of ${config.minHoursPerDay}h required`}
            color={todayStatusColor}
          />
          <StatCard
            label="Outage"
            value={formatDuration(todayOutageMins)}
            sub={activeOutage ? '● Live' : 'Total downtime'}
            color={todayOutageMins > 0 ? '#E53935' : '#00A651'}
          />
          <StatCard
            label="Supply %"
            value={`${Math.min(100, (todaySupplyHours / 24 * 100)).toFixed(0)}%`}
            sub="of 24h day"
            color={todayStatusColor}
          />
          <StatCard
            label={todayShortfall > 0 ? 'Shortfall' : 'Surplus'}
            value={`${todayShortfall > 0 ? '-' : '+'}${Math.abs(config.minHoursPerDay - todaySupplyHours).toFixed(1)}h`}
            sub={`vs Band ${band} min`}
            color={todayShortfall > 0 ? '#E53935' : '#00A651'}
          />
        </div>

        {/* Inline summary */}
        <div
          className="rounded-card px-4 py-3 text-xs leading-relaxed"
          style={{
            backgroundColor: '#111827',
            border: '1px solid rgba(255,255,255,0.07)',
            color: '#4A5470',
          }}
        >
          You received{' '}
          <span className="font-bold" style={{ color: '#F0F4FF' }}>{todaySupplyHours.toFixed(1)} hrs</span>
          {' '}today. Band {band} requires{' '}
          <span className="font-bold" style={{ color: '#F0F4FF' }}>{config.minHoursPerDay} hrs</span>
          {' '}minimum.{' '}
          {todayShortfall > 0 ? (
            <span style={{ color: '#fca5a5' }}>
              You are <strong>{todayShortfall.toFixed(1)} hrs short.</strong>
            </span>
          ) : (
            <span style={{ color: '#86efac' }}>
              You are <strong>{(todaySupplyHours - config.minHoursPerDay).toFixed(1)} hrs above</strong> the minimum.
            </span>
          )}
        </div>
      </section>

      {/* ── This Month ── */}
      <section>
        <SectionHeading>This Month</SectionHeading>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <StatCard
            label="Avg Daily"
            value={`${monthStats.avgDailySupplyHours.toFixed(1)}h`}
            sub={`min ${config.minHoursPerDay}h/day`}
            color={monthStats.avgDailySupplyHours >= config.minHoursPerDay * 0.9 ? '#00A651' : '#E53935'}
          />
          <StatCard
            label="Total Outage"
            value={`${monthStats.totalOutageHours.toFixed(1)}h`}
            sub={`${monthStats.days.length} days tracked`}
            color={monthStats.totalOutageHours === 0 ? '#00A651' : '#E53935'}
          />
          <StatCard
            label="Days on Target"
            value={`${monthStats.daysMetThreshold}`}
            sub={`supply above Band ${band} min`}
            color="#00A651"
          />
          <StatCard
            label="Days Below Min"
            value={`${monthStats.daysMissedThreshold}`}
            sub={
              complaintReadiness.ready
                ? 'Enough to file a complaint ✓'
                : monthStats.daysMissedThreshold === 0
                  ? `none below Band ${band} min yet`
                  : `${Math.max(0, 5 - monthStats.daysMissedThreshold)} more needed to complain`
            }
            color={monthStats.daysMissedThreshold > 0 ? '#E53935' : '#00A651'}
          />
        </div>

        {/* Complaint filing progress */}
        {!complaintReadiness.ready && (
          <div
            className="rounded-card px-4 py-3 mb-3"
            style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}>
                Complaint Eligibility
              </p>
              <span className="text-xs font-bold" style={{ color: monthStats.daysMissedThreshold >= 3 ? '#F5A623' : '#4A5470' }}>
                {monthStats.daysMissedThreshold} / 5 days
              </span>
            </div>
            <div className="w-full rounded-full overflow-hidden mb-2" style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (monthStats.daysMissedThreshold / 5) * 100)}%`,
                  backgroundColor: monthStats.daysMissedThreshold >= 3 ? '#F5A623' : '#4A5470',
                }}
              />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#4A5470' }}>
              {monthStats.daysMissedThreshold === 0
                ? `You need 5 days below the Band ${band} minimum this month to file a formal NERC complaint.`
                : `${Math.max(0, 5 - monthStats.daysMissedThreshold)} more day${5 - monthStats.daysMissedThreshold !== 1 ? 's' : ''} below the Band ${band} minimum and you can file a formal NERC complaint.`
              }
            </p>
          </div>
        )}

        {/* Streaks */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard
            label="Current Streak"
            value={`${currentStreak}d`}
            sub="missed in a row"
            color={
              currentStreak >= REGULATORY_TRIGGERS.CONSECUTIVE_DAYS_DOWNGRADE ? '#E53935'
              : currentStreak >= REGULATORY_TRIGGERS.CONSECUTIVE_DAYS_PUBLISH  ? '#F5A623'
              : '#4A5470'
            }
          />
          <StatCard
            label="Longest Streak"
            value={`${longestStreak}d`}
            sub="this month"
            color={longestStreak >= REGULATORY_TRIGGERS.CONSECUTIVE_DAYS_DOWNGRADE ? '#E53935' : '#4A5470'}
          />
        </div>

        {/* Regulatory alerts */}
        <div className="flex flex-col gap-3">
          {monthStats.compensationEligible && (
            <AlertBox color="amber" title="Compensation eligible">
              Your average of <strong>{monthStats.avgDailySupplyHours.toFixed(1)} hrs/day</strong> is below
              the {monthStats.thresholdRequired.toFixed(1)}-hour threshold for Band {band}. Under the NERC
              May 2024 Order, you are entitled to a service credit. Generate a complaint letter in the Report tab.
            </AlertBox>
          )}

          {currentStreak >= REGULATORY_TRIGGERS.CONSECUTIVE_DAYS_DOWNGRADE && (
            <AlertBox color="red" title="Mandatory downgrade triggered">
              7 consecutive days below threshold. NERC regulations require automatic feeder downgrade.
              Generate a complaint letter immediately from the Report tab.
            </AlertBox>
          )}

          {currentStreak >= REGULATORY_TRIGGERS.CONSECUTIVE_DAYS_PUBLISH
            && currentStreak < REGULATORY_TRIGGERS.CONSECUTIVE_DAYS_DOWNGRADE && (
            <AlertBox color="amber" title="Publication obligation">
              {currentStreak} consecutive days missed. {profile?.disco || 'Your DisCo'} is obligated to publish
              an explanation on its website by 10:00 AM the following day.
            </AlertBox>
          )}

          {complaintReadiness.ready && (
            <AlertBox color="green" title="Ready to file a complaint">
              You have <strong>{complaintReadiness.missedDays} days</strong> below the Band {band} minimum
              this month. Generate your complaint letter in the <strong>Report tab</strong> — you may be
              entitled to a service credit under the NERC May 2024 Order.
            </AlertBox>
          )}
        </div>
      </section>

      {/* ── Rank & Streak ── */}
      <section>
        <SectionHeading>Your Rank</SectionHeading>
        <div
          className="rounded-card p-4 flex items-center gap-4"
          style={{
            backgroundColor: '#111827',
            border: currentTier
              ? `1px solid ${currentTier.color}40`
              : '1px solid rgba(255,255,255,0.07)',
            boxShadow: currentTier ? `0 0 20px ${currentTier.glow}` : 'none',
          }}
        >
          {/* Streak ring */}
          <div
            className="flex flex-col items-center justify-center shrink-0 rounded-full"
            style={{
              width: 60, height: 60,
              background: currentTier
                ? `radial-gradient(circle, ${currentTier.glow} 0%, transparent 70%)`
                : 'rgba(255,255,255,0.04)',
              border: `2px solid ${currentTier ? currentTier.color : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            <span
              className="text-xl font-black tabular-nums leading-none"
              style={{ color: currentTier ? currentTier.color : '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}
            >
              {streak}
            </span>
            <span className="text-[9px] uppercase tracking-widest" style={{ color: '#4A5470' }}>days</span>
          </div>

          <div className="flex-1 min-w-0">
            <p
              className="text-base font-black leading-tight"
              style={{ color: currentTier ? currentTier.color : '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}
            >
              {currentTier ? currentTier.label : 'No Rank Yet'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#4A5470' }}>
              {streak === 0
                ? 'Log an outage or confirm nothing today to start your streak.'
                : todayLogged
                  ? `${streak}-day streak — keep it going!`
                  : `${streak}-day streak — log today to maintain it.`
              }
            </p>
          </div>

          <button
            onClick={onViewBadges}
            className="shrink-0 px-3 py-2 rounded-btn text-xs font-bold"
            style={{
              backgroundColor: currentTier ? `${currentTier.color}18` : 'rgba(255,255,255,0.06)',
              color: currentTier ? currentTier.color : '#8B95B0',
              border: `1px solid ${currentTier ? `${currentTier.color}35` : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            Badges
          </button>
        </div>
      </section>
    </div>
  );
}
