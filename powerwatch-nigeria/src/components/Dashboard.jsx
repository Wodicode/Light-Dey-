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
  getTodaySupplyHours,
  getMonthlyStats,
  todayStr,
  formatDuration,
} from '../lib/calculations.js';

function StatCard({ label, value, sub, color }) {
  return (
    <div className="rounded-card p-4 flex flex-col gap-1" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
      <p className="text-xs font-medium text-textMuted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color || '#F8FAFC' }}>{value}</p>
      {sub && <p className="text-xs text-textMuted">{sub}</p>}
    </div>
  );
}

function AlertBox({ color, children }) {
  const colors = {
    amber: { bg: '#F39C1218', border: '#F39C12', text: '#fbbf24' },
    red:   { bg: '#E74C3C18', border: '#E74C3C', text: '#fca5a5' },
    green: { bg: '#2ECC7118', border: '#2ECC71', text: '#86efac' },
  };
  const c = colors[color] || colors.amber;
  return (
    <div className="rounded-card px-4 py-3 text-sm" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {children}
    </div>
  );
}

// Skeleton loader for a card
function SkeletonCard() {
  return (
    <div className="rounded-card p-4 animate-pulse" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
      <div className="h-3 w-24 rounded mb-3" style={{ backgroundColor: '#334155' }} />
      <div className="h-7 w-16 rounded mb-2" style={{ backgroundColor: '#334155' }} />
      <div className="h-3 w-32 rounded" style={{ backgroundColor: '#334155' }} />
    </div>
  );
}

export default function Dashboard() {
  const { profile } = useProfile();
  const { outages, outagesLoading, activeOutage } = useOutages();

  // Tick every second so live active outage updates today's supply
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
  const todayPct = (todaySupplyHours / config.minHoursPerDay) * 100;
  const todayMet = isDayThresholdMet(band, todayOutageMins);
  const todayShortfall = Math.max(0, config.minHoursPerDay - todaySupplyHours);

  let todayStatusColor = '#2ECC71';
  let todayStatusLabel = 'On Track';
  if (!todayMet) {
    const shortfallPct = todayShortfall / config.minHoursPerDay;
    if (shortfallPct > 0.10) {
      todayStatusColor = '#E74C3C';
      todayStatusLabel = 'Below Threshold';
    } else {
      todayStatusColor = '#F39C12';
      todayStatusLabel = 'Near Threshold';
    }
  }

  // Monthly
  const monthStats = useMemo(() => getMonthlyStats(outageMap, band), [outageMap, band]);
  const monthDays = getDaysInCurrentMonth();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const today = new Date();

  const currentStreak = useMemo(
    () => getCurrentConsecutiveMissedStreak(outageMap, band),
    [outageMap, band]
  );
  const longestStreak = useMemo(
    () => getLongestConsecutiveMissedStreak(outageMap, band, startOfMonth, today),
    [outageMap, band]
  );

  if (outagesLoading) {
    return (
      <div className="px-4 py-6 flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold text-textPrimary mb-3">Today</h2>
          <div className="grid grid-cols-2 gap-3">
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-textPrimary mb-3">This Month</h2>
          <div className="grid grid-cols-2 gap-3">
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 flex flex-col gap-6">
      {/* Profile banner if no profile */}
      {!profile && (
        <AlertBox color="amber">
          <strong>Set up your profile</strong> to personalise thresholds and generate complaint letters. Go to Settings.
        </AlertBox>
      )}

      {/* Today */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-textPrimary">Today</h2>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: todayStatusColor + '22', color: todayStatusColor, border: `1px solid ${todayStatusColor}55` }}
          >
            {todayStatusLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <StatCard
            label="Supply Today"
            value={`${todaySupplyHours.toFixed(1)}h`}
            sub={`of ${config.minHoursPerDay}h minimum`}
            color={todayStatusColor}
          />
          <StatCard
            label="Outage Today"
            value={formatDuration(todayOutageMins)}
            sub={activeOutage ? 'Live outage running' : 'Total downtime'}
            color={todayOutageMins > 0 ? '#E74C3C' : '#2ECC71'}
          />
          <StatCard
            label="Supply %"
            value={`${Math.min(100, (todaySupplyHours / 24 * 100)).toFixed(0)}%`}
            sub="of 24-hour day"
          />
          <StatCard
            label="vs Band Min"
            value={`${todayShortfall > 0 ? '-' : ''}${Math.abs(config.minHoursPerDay - todaySupplyHours).toFixed(1)}h`}
            sub={todayShortfall > 0 ? 'shortfall' : 'above target'}
            color={todayShortfall > 0 ? '#E74C3C' : '#2ECC71'}
          />
        </div>

        <div className="rounded-card p-3 text-sm text-textMuted" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
          You received <strong className="text-textPrimary">{todaySupplyHours.toFixed(1)} hrs</strong> today.{' '}
          Band {band} requires <strong className="text-textPrimary">{config.minHoursPerDay} hrs</strong> minimum.{' '}
          {todayShortfall > 0 ? (
            <>You are <strong style={{ color: '#E74C3C' }}>{todayShortfall.toFixed(1)} hrs short</strong>.</>
          ) : (
            <>You are <strong style={{ color: '#2ECC71' }}>{(todaySupplyHours - config.minHoursPerDay).toFixed(1)} hrs above</strong> the minimum.</>
          )}
        </div>
      </section>

      {/* This Month */}
      <section>
        <h2 className="text-xl font-bold text-textPrimary mb-3">This Month</h2>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <StatCard
            label="Avg Daily Supply"
            value={`${monthStats.avgDailySupplyHours.toFixed(1)}h`}
            sub={`min ${config.minHoursPerDay}h/day`}
            color={monthStats.avgDailySupplyHours >= config.minHoursPerDay * config.compensationThreshold ? '#2ECC71' : '#E74C3C'}
          />
          <StatCard
            label="Total Outage"
            value={`${monthStats.totalOutageHours.toFixed(1)}h`}
            sub={`over ${monthStats.days.length} day${monthStats.days.length !== 1 ? 's' : ''}`}
            color='#E74C3C'
          />
          <StatCard
            label="Days Met Target"
            value={`${monthStats.daysMetThreshold}`}
            sub={`of ${monthStats.days.length} days`}
            color='#2ECC71'
          />
          <StatCard
            label="Days Missed"
            value={`${monthStats.daysMissedThreshold}`}
            sub="below minimum"
            color={monthStats.daysMissedThreshold > 0 ? '#E74C3C' : '#2ECC71'}
          />
        </div>

        {/* Streaks */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <StatCard
            label="Current Streak"
            value={`${currentStreak}d`}
            sub="consecutive missed"
            color={currentStreak >= REGULATORY_TRIGGERS.CONSECUTIVE_DAYS_DOWNGRADE ? '#E74C3C' : currentStreak >= REGULATORY_TRIGGERS.CONSECUTIVE_DAYS_PUBLISH ? '#F39C12' : '#94A3B8'}
          />
          <StatCard
            label="Longest Streak"
            value={`${longestStreak}d`}
            sub="this month"
            color={longestStreak >= REGULATORY_TRIGGERS.CONSECUTIVE_DAYS_DOWNGRADE ? '#E74C3C' : '#94A3B8'}
          />
        </div>

        {/* Regulatory alerts */}
        {monthStats.compensationEligible && (
          <AlertBox color="amber">
            <strong>Compensation eligible.</strong> Your monthly average supply of{' '}
            <strong>{monthStats.avgDailySupplyHours.toFixed(1)} hrs/day</strong> falls below the{' '}
            {monthStats.thresholdRequired.toFixed(1)}-hour compensation threshold for Band {band}.{' '}
            Under NERC's Order on Migration and Compensation for Service Failure, you are entitled to compensation.{' '}
            Go to the <strong>Report</strong> tab to generate a complaint letter.
          </AlertBox>
        )}

        {currentStreak >= REGULATORY_TRIGGERS.CONSECUTIVE_DAYS_DOWNGRADE && (
          <AlertBox color="red">
            <strong>7-day consecutive failure detected.</strong> Under NERC regulations this feeder must be automatically downgraded.{' '}
            Generate a complaint letter immediately from the <strong>Report</strong> tab.
          </AlertBox>
        )}

        {currentStreak >= REGULATORY_TRIGGERS.CONSECUTIVE_DAYS_PUBLISH && currentStreak < REGULATORY_TRIGGERS.CONSECUTIVE_DAYS_DOWNGRADE && (
          <AlertBox color="amber">
            You have missed your band threshold for <strong>{currentStreak} consecutive days</strong>.{' '}
            {profile?.disco || 'Your DisCo'} is obligated to publish an explanation on its website by 10am the following day.
          </AlertBox>
        )}
      </section>
    </div>
  );
}
