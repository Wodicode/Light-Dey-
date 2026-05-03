import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell,
  LineChart, Line, Legend,
} from 'recharts';
import { useProfile, useOutages } from '../App.jsx';
import {
  BAND_CONFIG,
  buildOutageMap,
  getDaysInCurrentMonth,
  getLast30Days,
  isDayThresholdMet,
  getCurrentConsecutiveMissedStreak,
  detectOutagePatterns,
  getComplaintReadiness,
  formatDuration,
} from '../lib/calculations.js';

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatRollingLabel(mmdd) {
  const [mm, dd] = mmdd.split('-').map(Number);
  return `${MONTH_ABBR[mm - 1]} ${dd}`;
}

const tooltipStyle = {
  backgroundColor: '#1E293B',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#F8FAFC',
  fontSize: 12,
};

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-card p-4 flex flex-col gap-1" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
      <p className="text-xs font-medium text-textMuted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color || '#F8FAFC' }}>{value}</p>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-card p-4 animate-pulse" style={{ backgroundColor: '#1E293B', border: '1px solid #334155', height: 240 }}>
      <div className="h-4 w-32 rounded mb-4" style={{ backgroundColor: '#334155' }} />
      <div className="flex items-end gap-1 h-36">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-sm" style={{ backgroundColor: '#334155', height: `${20 + Math.random() * 60}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function Analytics() {
  const { profile } = useProfile();
  const { outages, outagesLoading } = useOutages();

  const band = profile?.service_band || 'A';
  const config = BAND_CONFIG[band] || BAND_CONFIG['A'];

  const outageMap = useMemo(() => buildOutageMap(outages), [outages]);

  // Daily supply hours for current month
  const monthlyData = useMemo(() => {
    return getDaysInCurrentMonth().map(dateStr => {
      const outageMinutes = outageMap[dateStr] || 0;
      const supplyHours = (24 * 60 - outageMinutes) / 60;
      const met = isDayThresholdMet(band, outageMinutes);
      const dayNum = parseInt(dateStr.split('-')[2]);
      return { day: dayNum, supplyHours: parseFloat(supplyHours.toFixed(2)), met };
    });
  }, [outageMap, band]);

  // 30-day rolling average
  const rollingData = useMemo(() => {
    const days = getLast30Days();
    return days.map((dateStr, idx) => {
      const windowStart = Math.max(0, idx - 6);
      const window = days.slice(windowStart, idx + 1);
      const avgSupply = window.reduce((sum, d) => {
        const outMins = outageMap[d] || 0;
        return sum + (24 * 60 - outMins) / 60;
      }, 0) / window.length;
      const outageMinutes = outageMap[dateStr] || 0;
      const daySupply = (24 * 60 - outageMinutes) / 60;
      const label = dateStr.slice(5); // MM-DD
      return {
        date: label,
        avgSupply: parseFloat(avgSupply.toFixed(2)),
        daySupply: parseFloat(daySupply.toFixed(2)),
      };
    });
  }, [outageMap]);

  // Summary stats
  const monthlyStats = useMemo(() => {
    const days = getDaysInCurrentMonth();
    let totalOutage = 0;
    let best = { supplyHours: 0, date: '' };
    let worst = { supplyHours: 24, date: '' };
    days.forEach(dateStr => {
      const outMins = outageMap[dateStr] || 0;
      const supply = (24 * 60 - outMins) / 60;
      totalOutage += outMins;
      if (supply > best.supplyHours) best = { supplyHours: supply, date: dateStr };
      if (supply < worst.supplyHours) worst = { supplyHours: supply, date: dateStr };
    });
    return { totalOutageHours: totalOutage / 60, bestDay: best, worstDay: worst };
  }, [outageMap]);

  const currentStreak = useMemo(
    () => getCurrentConsecutiveMissedStreak(outageMap, band), [outageMap, band]
  );
  const compensationLine = config.minHoursPerDay * config.compensationThreshold;

  const daysWithData = useMemo(
    () => getDaysInCurrentMonth().filter(d => outageMap[d] !== undefined).length,
    [outageMap]
  );

  // Compliance progress (days met vs days tracked)
  const metDays = useMemo(
    () => monthlyData.filter(d => d.met).length,
    [monthlyData]
  );

  // Complaint readiness
  const readiness = useMemo(
    () => getComplaintReadiness(outageMap, band), [outageMap, band]
  );

  // Pattern detection
  const patterns = useMemo(() => detectOutagePatterns(outages), [outages]);

  if (outagesLoading) {
    return (
      <div className="px-4 py-6 flex flex-col gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>
    );
  }

  if (!outagesLoading && daysWithData === 0) {
    return (
      <div className="px-4 py-6 flex flex-col gap-6">
        <h2 className="text-xl font-bold text-textPrimary">Analytics</h2>
        <div
          className="rounded-card p-8 text-center flex flex-col items-center gap-3"
          style={{ backgroundColor: '#1E293B', boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }}
        >
          <span style={{ fontSize: 40 }}>📊</span>
          <p className="font-black text-textPrimary text-base">No outage data yet</p>
          <p className="text-xs leading-relaxed max-w-xs" style={{ color: '#475569' }}>
            Tap <strong style={{ color: '#F8FAFC' }}>LIGHT IS OFF</strong> on the Log tab when your
            power goes out. Charts will appear after your first logged outage.
          </p>
        </div>
      </div>
    );
  }

  const compliancePct = daysWithData > 0 ? Math.round((metDays / daysWithData) * 100) : 0;

  return (
    <div className="px-4 py-6 flex flex-col gap-6">
      <h2 className="text-xl font-bold text-textPrimary">Analytics</h2>

      {daysWithData < 7 && (
        <div
          className="rounded-card px-4 py-3 text-xs"
          style={{ backgroundColor: '#1E293B', borderLeft: '3px solid #F39C12', color: '#fbbf24', boxShadow: '0 0 0 1px rgba(243,156,18,0.1)' }}
        >
          {daysWithData} day{daysWithData !== 1 ? 's' : ''} tracked this month.
          Charts become more meaningful after 7+ days of data.
        </div>
      )}

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total Outage This Month"
          value={`${monthlyStats.totalOutageHours.toFixed(1)}h`}
          color="#E74C3C"
        />
        <StatCard
          label="Current Missed Streak"
          value={`${currentStreak}d`}
          color={currentStreak >= 7 ? '#E74C3C' : currentStreak >= 2 ? '#F39C12' : '#94A3B8'}
        />
        <StatCard
          label="Best Day"
          value={`${monthlyStats.bestDay.supplyHours.toFixed(1)}h`}
          color="#2ECC71"
        />
        <StatCard
          label="Worst Day"
          value={`${monthlyStats.worstDay.supplyHours.toFixed(1)}h`}
          color="#E74C3C"
        />
      </div>

      {/* Compliance progress bar */}
      {daysWithData > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wide">
              Monthly Compliance
            </h3>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: compliancePct >= 90 ? 'rgba(46,204,113,0.15)' : compliancePct >= 60 ? 'rgba(243,156,18,0.15)' : 'rgba(231,76,60,0.15)',
                color: compliancePct >= 90 ? '#2ECC71' : compliancePct >= 60 ? '#F39C12' : '#E74C3C',
              }}
            >
              {compliancePct}%
            </span>
          </div>
          <div className="rounded-card p-4" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            <div className="w-full rounded-full overflow-hidden" style={{ height: 8, backgroundColor: '#334155' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${compliancePct}%`,
                  backgroundColor: compliancePct >= 90 ? '#2ECC71' : compliancePct >= 60 ? '#F39C12' : '#E74C3C',
                }}
              />
            </div>
            <p className="text-xs text-textMuted mt-2">
              <span className="text-textPrimary font-semibold">{metDays}</span> of{' '}
              <span className="text-textPrimary font-semibold">{daysWithData}</span> days tracked
              met the Band {band} minimum of{' '}
              <span className="text-textPrimary font-semibold">{config.minHoursPerDay}h/day</span>
            </p>
          </div>
        </section>
      )}

      {/* Daily supply bar chart */}
      <section>
        <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wide mb-3">
          Daily Supply — This Month (Band {band}: {config.minHoursPerDay}h min)
        </h3>
        <div className="rounded-card p-4" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
          {monthlyData.length === 0 ? (
            <p className="text-textMuted text-sm text-center py-8">No data for this month yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis
                  domain={[0, 24]}
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickCount={5}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  formatter={(v) => [`${v}h supply`, 'Day']}
                />
                <ReferenceLine y={config.minHoursPerDay} stroke="#F39C12" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `${config.minHoursPerDay}h min`, fill: '#F39C12', fontSize: 10, position: 'right' }} />
                <Bar dataKey="supplyHours" radius={[3, 3, 0, 0]}>
                  {monthlyData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.met ? '#2ECC71' : '#E74C3C'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* 30-day rolling average */}
      <section>
        <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wide mb-3">
          30-Day Rolling Average
        </h3>
        <div className="rounded-card p-4" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={rollingData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94A3B8', fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                interval={6}
                tickFormatter={formatRollingLabel}
              />
              <YAxis domain={[0, 24]} tick={{ fill: '#94A3B8', fontSize: 10 }} tickLine={false} axisLine={false} tickCount={5} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ stroke: '#334155' }}
                labelFormatter={formatRollingLabel}
              />
              <ReferenceLine y={config.minHoursPerDay} stroke="#F39C12" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `${config.minHoursPerDay}h`, fill: '#F39C12', fontSize: 10, position: 'right' }} />
              <ReferenceLine y={compensationLine} stroke="#E74C3C" strokeDasharray="4 4" strokeWidth={1} label={{ value: `${compensationLine}h comp.`, fill: '#E74C3C', fontSize: 9, position: 'right' }} />
              <Line type="monotone" dataKey="avgSupply" stroke="#2ECC71" strokeWidth={2} dot={false} name="7-day avg" />
              <Line type="monotone" dataKey="daySupply" stroke="#94A3B8" strokeWidth={1} dot={false} strokeOpacity={0.5} name="Daily" />
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#94A3B8', paddingTop: 8 }}
                formatter={(v) => <span style={{ color: '#94A3B8' }}>{v}</span>}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-textMuted mt-2 text-center">
          Orange dashed = Band {band} minimum · Red dashed = 90% compensation threshold
        </p>
      </section>

      {/* Pattern insights */}
      {patterns && (
        <section>
          <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wide mb-3">
            Outage Patterns
          </h3>
          <div className="rounded-card p-4 flex flex-col gap-3" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-start gap-2">
                <span style={{ color: '#F39C12', fontSize: 16, lineHeight: 1.4 }}>◆</span>
                <span style={{ color: '#94A3B8' }}>
                  Outages most often start around{' '}
                  <strong style={{ color: '#F8FAFC' }}>{patterns.peakHourLabel}</strong>
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span style={{ color: '#F39C12', fontSize: 16, lineHeight: 1.4 }}>◆</span>
                <span style={{ color: '#94A3B8' }}>
                  Most frequent outage day:{' '}
                  <strong style={{ color: '#F8FAFC' }}>{patterns.peakDayOfWeek}</strong>
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span style={{ color: '#F39C12', fontSize: 16, lineHeight: 1.4 }}>◆</span>
                <span style={{ color: '#94A3B8' }}>
                  Average outage lasts{' '}
                  <strong style={{ color: '#F8FAFC' }}>{formatDuration(patterns.avgDuration)}</strong>
                </span>
              </div>
              {patterns.weekendHeavy && (
                <div className="flex items-start gap-2">
                  <span style={{ color: '#F39C12', fontSize: 16, lineHeight: 1.4 }}>◆</span>
                  <span style={{ color: '#94A3B8' }}>
                    Weekend outages are <strong style={{ color: '#F8FAFC' }}>notably longer</strong> than weekdays
                  </span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span style={{ color: '#F39C12', fontSize: 16, lineHeight: 1.4 }}>◆</span>
                <span style={{ color: '#94A3B8' }}>
                  Longest outage:{' '}
                  <strong style={{ color: '#F8FAFC' }}>{formatDuration(patterns.longestOutage.duration)}</strong>
                  {' '}on {patterns.longestOutage.date}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Complaint readiness prompt */}
      {readiness.ready && (
        <div
          className="rounded-card px-4 py-3 text-xs"
          style={{ backgroundColor: '#1E293B', borderLeft: '3px solid #2ECC71', color: '#86efac', boxShadow: '0 0 0 1px rgba(46,204,113,0.1)' }}
        >
          <p className="font-black uppercase tracking-widest text-accent mb-1" style={{ fontSize: 10 }}>
            Ready to file a complaint
          </p>
          You have <strong className="text-textPrimary">{readiness.missedDays} days</strong> below the
          Band {band} minimum this month. Head to the <strong className="text-textPrimary">Report tab</strong> to
          generate your complaint letter.
        </div>
      )}
    </div>
  );
}
