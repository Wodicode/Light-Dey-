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

// ── Stat card with colored top accent bar ────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  const c = color || '#64748B';
  return (
    <div
      className="rounded-card p-4 flex flex-col gap-1 overflow-hidden relative"
      style={{
        backgroundColor: '#1E293B',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.05)',
      }}
    >
      {/* Colored accent stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ backgroundColor: c, opacity: 0.9 }}
      />
      <p className="text-xs font-semibold uppercase tracking-widest mt-0.5" style={{ color: '#64748B' }}>
        {label}
      </p>
      <p
        className="text-3xl font-black tabular-nums leading-none tracking-tight"
        style={{ color: c }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{sub}</p>
      )}
    </div>
  );
}

// ── Alert box with left-border accent + icon ─────────────────────────────────
function AlertBox({ color, title, children }) {
  const cfg = {
    amber: { bg: '#F39C120A', border: '#F39C12', text: '#fbbf24', dim: '#78450a' },
    red:   { bg: '#E74C3C0A', border: '#E74C3C', text: '#fca5a5', dim: '#7f1d1d' },
    green: { bg: '#2ECC710A', border: '#2ECC71', text: '#86efac', dim: '#14532d' },
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
    <div className="rounded-card p-4 overflow-hidden relative" style={{ backgroundColor: '#1E293B' }}>
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
      <h2 className="text-base font-black uppercase tracking-widest" style={{ color: '#94A3B8' }}>
        {children}
      </h2>
      {badge && (
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: badgeColor + '22',
            color: badgeColor,
            border: `1px solid ${badgeColor}44`,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { profile } = useProfile();
  const { outages, outagesLoading, activeOutage } = useOutages();

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

  let todayStatusColor = '#2ECC71';
  let todayStatusLabel = 'On Track';
  if (!todayMet) {
    const shortfallPct = todayShortfall / config.minHoursPerDay;
    if (shortfallPct > 0.10) { todayStatusColor = '#E74C3C'; todayStatusLabel = 'Below Threshold'; }
    else { todayStatusColor = '#F39C12'; todayStatusLabel = 'Near Threshold'; }
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

  if (outagesLoading) {
    return (
      <div className="px-4 py-6 flex flex-col gap-8">
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
    <div className="px-4 py-6 flex flex-col gap-8">
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
            color={todayOutageMins > 0 ? '#E74C3C' : '#2ECC71'}
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
            color={todayShortfall > 0 ? '#E74C3C' : '#2ECC71'}
          />
        </div>

        {/* Inline summary */}
        <div
          className="rounded-card px-4 py-3 text-xs leading-relaxed"
          style={{
            backgroundColor: '#1E293B',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.05)',
            color: '#64748B',
          }}
        >
          You received{' '}
          <span className="font-bold" style={{ color: '#F8FAFC' }}>{todaySupplyHours.toFixed(1)} hrs</span>
          {' '}today. Band {band} requires{' '}
          <span className="font-bold" style={{ color: '#F8FAFC' }}>{config.minHoursPerDay} hrs</span>
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
            color={monthStats.avgDailySupplyHours >= config.minHoursPerDay * 0.9 ? '#2ECC71' : '#E74C3C'}
          />
          <StatCard
            label="Total Outage"
            value={`${monthStats.totalOutageHours.toFixed(1)}h`}
            sub={`${monthStats.days.length} days tracked`}
            color={monthStats.totalOutageHours === 0 ? '#2ECC71' : '#E74C3C'}
          />
          <StatCard
            label="Days Met"
            value={`${monthStats.daysMetThreshold}`}
            sub={`of ${monthStats.days.length} days`}
            color="#2ECC71"
          />
          <StatCard
            label="Days Missed"
            value={`${monthStats.daysMissedThreshold}`}
            sub="below minimum"
            color={monthStats.daysMissedThreshold > 0 ? '#E74C3C' : '#2ECC71'}
          />
        </div>

        {/* Streaks */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard
            label="Current Streak"
            value={`${currentStreak}d`}
            sub="missed in a row"
            color={
              currentStreak >= REGULATORY_TRIGGERS.CONSECUTIVE_DAYS_DOWNGRADE ? '#E74C3C'
              : currentStreak >= REGULATORY_TRIGGERS.CONSECUTIVE_DAYS_PUBLISH  ? '#F39C12'
              : '#475569'
            }
          />
          <StatCard
            label="Longest Streak"
            value={`${longestStreak}d`}
            sub="this month"
            color={longestStreak >= REGULATORY_TRIGGERS.CONSECUTIVE_DAYS_DOWNGRADE ? '#E74C3C' : '#475569'}
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
    </div>
  );
}
