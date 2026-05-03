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
  backgroundColor: '#111827',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#F0F4FF',
  fontSize: 12,
};

function StatCard({ label, value, color }) {
  return (
    <div
      className="rounded-card p-4 flex flex-col gap-1 relative overflow-hidden"
      style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="absolute top-0 left-0 right-0" style={{ height: 2, backgroundColor: color || '#4A5470', opacity: 0.9 }} />
      <p className="text-xs font-semibold uppercase tracking-widest mt-0.5" style={{ color: '#4A5470' }}>{label}</p>
      <p
        className="text-3xl font-black tabular-nums leading-none tracking-tight"
        style={{ color: color || '#F0F4FF', fontFamily: 'Syne, system-ui, sans-serif' }}
      >
        {value}
      </p>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-card p-4 animate-pulse" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)', height: 240 }}>
      <div className="h-4 w-32 rounded mb-4 skeleton" />
      <div className="flex items-end gap-1 h-36">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-sm skeleton" style={{ height: `${20 + (i * 13 % 60)}%` }} />
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

  const monthlyData = useMemo(() => {
    return getDaysInCurrentMonth().map(dateStr => {
      const outageMinutes = outageMap[dateStr] || 0;
      const supplyHours = (24 * 60 - outageMinutes) / 60;
      const met = isDayThresholdMet(band, outageMinutes);
      const dayNum = parseInt(dateStr.split('-')[2]);
      return { day: dayNum, supplyHours: parseFloat(supplyHours.toFixed(2)), met };
    });
  }, [outageMap, band]);

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
      const label = dateStr.slice(5);
      return {
        date: label,
        avgSupply: parseFloat(avgSupply.toFixed(2)),
        daySupply: parseFloat(daySupply.toFixed(2)),
      };
    });
  }, [outageMap]);

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

  const metDays = useMemo(
    () => monthlyData.filter(d => d.met).length,
    [monthlyData]
  );

  const readiness = useMemo(
    () => getComplaintReadiness(outageMap, band), [outageMap, band]
  );

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
        <h2
          className="text-xl font-black text-textPrimary"
          style={{ fontFamily: 'Syne, system-ui, sans-serif' }}
        >
          Analytics
        </h2>
        <div
          className="rounded-card p-8 text-center flex flex-col items-center gap-3"
          style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span style={{ fontSize: 40 }}>📊</span>
          <p className="font-black text-textPrimary text-base">No outage data yet</p>
          <p className="text-xs leading-relaxed max-w-xs" style={{ color: '#4A5470' }}>
            Tap <strong style={{ color: '#F0F4FF' }}>LIGHT IS OFF</strong> on the Log tab when your
            power goes out. Charts will appear after your first logged outage.
          </p>
        </div>
      </div>
    );
  }

  const compliancePct = daysWithData > 0 ? Math.round((metDays / daysWithData) * 100) : 0;

  return (
    <div className="px-4 py-6 flex flex-col gap-6">
      <h2
        className="text-xl font-black text-textPrimary"
        style={{ fontFamily: 'Syne, system-ui, sans-serif' }}
      >
        Analytics
      </h2>

      {daysWithData < 7 && (
        <div
          className="rounded-card px-4 py-3 text-xs"
          style={{ backgroundColor: 'rgba(245,166,35,0.06)', borderLeft: '3px solid #F5A623', color: '#fbbf24' }}
        >
          {daysWithData} day{daysWithData !== 1 ? 's' : ''} tracked this month.
          Charts become more meaningful after 7+ days of data.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total Outage This Month"
          value={`${monthlyStats.totalOutageHours.toFixed(1)}h`}
          color="#E53935"
        />
        <StatCard
          label="Current Missed Streak"
          value={`${currentStreak}d`}
          color={currentStreak >= 7 ? '#E53935' : currentStreak >= 2 ? '#F5A623' : '#8B95B0'}
        />
        <StatCard
          label="Best Day"
          value={`${monthlyStats.bestDay.supplyHours.toFixed(1)}h`}
          color="#00A651"
        />
        <StatCard
          label="Worst Day"
          value={`${monthlyStats.worstDay.supplyHours.toFixed(1)}h`}
          color="#E53935"
        />
      </div>

      {daysWithData > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}
            >
              Monthly Compliance
            </h3>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: compliancePct >= 90 ? 'rgba(0,166,81,0.15)' : compliancePct >= 60 ? 'rgba(245,166,35,0.15)' : 'rgba(229,57,53,0.15)',
                color: compliancePct >= 90 ? '#00A651' : compliancePct >= 60 ? '#F5A623' : '#E53935',
                border: `1px solid ${compliancePct >= 90 ? 'rgba(0,166,81,0.3)' : compliancePct >= 60 ? 'rgba(245,166,35,0.3)' : 'rgba(229,57,53,0.3)'}`,
              }}
            >
              {compliancePct}%
            </span>
          </div>
          <div className="rounded-card p-4" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="w-full rounded-full overflow-hidden" style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${compliancePct}%`,
                  backgroundColor: compliancePct >= 90 ? '#00A651' : compliancePct >= 60 ? '#F5A623' : '#E53935',
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

      <section>
        <h3
          className="text-xs font-black uppercase tracking-widest mb-3"
          style={{ color: '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}
        >
          Daily Supply — This Month (Band {band}: {config.minHoursPerDay}h min)
        </h3>
        <div className="rounded-card p-4" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
          {monthlyData.length === 0 ? (
            <p className="text-textMuted text-sm text-center py-8">No data for this month yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#8B95B0', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis
                  domain={[0, 24]}
                  tick={{ fill: '#8B95B0', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickCount={5}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  formatter={(v) => [`${v}h supply`, 'Day']}
                />
                <ReferenceLine y={config.minHoursPerDay} stroke="#F5A623" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `${config.minHoursPerDay}h min`, fill: '#F5A623', fontSize: 10, position: 'right' }} />
                <Bar dataKey="supplyHours" radius={[3, 3, 0, 0]}>
                  {monthlyData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.met ? '#00A651' : '#E53935'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section>
        <h3
          className="text-xs font-black uppercase tracking-widest mb-3"
          style={{ color: '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}
        >
          30-Day Rolling Average
        </h3>
        <div className="rounded-card p-4" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={rollingData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#8B95B0', fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                interval={6}
                tickFormatter={formatRollingLabel}
              />
              <YAxis domain={[0, 24]} tick={{ fill: '#8B95B0', fontSize: 10 }} tickLine={false} axisLine={false} tickCount={5} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ stroke: 'rgba(255,255,255,0.08)' }}
                labelFormatter={formatRollingLabel}
              />
              <ReferenceLine y={config.minHoursPerDay} stroke="#F5A623" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `${config.minHoursPerDay}h`, fill: '#F5A623', fontSize: 10, position: 'right' }} />
              <ReferenceLine y={compensationLine} stroke="#E53935" strokeDasharray="4 4" strokeWidth={1} label={{ value: `${compensationLine}h comp.`, fill: '#E53935', fontSize: 9, position: 'right' }} />
              <Line type="monotone" dataKey="avgSupply" stroke="#00A651" strokeWidth={2} dot={false} name="7-day avg" />
              <Line type="monotone" dataKey="daySupply" stroke="#8B95B0" strokeWidth={1} dot={false} strokeOpacity={0.5} name="Daily" />
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#8B95B0', paddingTop: 8 }}
                formatter={(v) => <span style={{ color: '#8B95B0' }}>{v}</span>}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-textMuted mt-2 text-center">
          Orange dashed = Band {band} minimum · Red dashed = 90% compensation threshold
        </p>
      </section>

      {patterns && (
        <section>
          <h3
            className="text-xs font-black uppercase tracking-widest mb-3"
            style={{ color: '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}
          >
            Outage Patterns
          </h3>
          <div className="rounded-card p-4 flex flex-col gap-3" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-start gap-2">
                <span style={{ color: '#F5A623', fontSize: 16, lineHeight: 1.4 }}>◆</span>
                <span style={{ color: '#8B95B0' }}>
                  Outages most often start around{' '}
                  <strong style={{ color: '#F0F4FF' }}>{patterns.peakHourLabel}</strong>
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span style={{ color: '#F5A623', fontSize: 16, lineHeight: 1.4 }}>◆</span>
                <span style={{ color: '#8B95B0' }}>
                  Most frequent outage day:{' '}
                  <strong style={{ color: '#F0F4FF' }}>{patterns.peakDayOfWeek}</strong>
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span style={{ color: '#F5A623', fontSize: 16, lineHeight: 1.4 }}>◆</span>
                <span style={{ color: '#8B95B0' }}>
                  Average outage lasts{' '}
                  <strong style={{ color: '#F0F4FF' }}>{formatDuration(patterns.avgDuration)}</strong>
                </span>
              </div>
              {patterns.weekendHeavy && (
                <div className="flex items-start gap-2">
                  <span style={{ color: '#F5A623', fontSize: 16, lineHeight: 1.4 }}>◆</span>
                  <span style={{ color: '#8B95B0' }}>
                    Weekend outages are <strong style={{ color: '#F0F4FF' }}>notably longer</strong> than weekdays
                  </span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span style={{ color: '#F5A623', fontSize: 16, lineHeight: 1.4 }}>◆</span>
                <span style={{ color: '#8B95B0' }}>
                  Longest outage:{' '}
                  <strong style={{ color: '#F0F4FF' }}>{formatDuration(patterns.longestOutage.duration)}</strong>
                  {' '}on {patterns.longestOutage.date}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {readiness.ready && (
        <div
          className="rounded-card px-4 py-3 text-xs"
          style={{ backgroundColor: 'rgba(0,166,81,0.06)', borderLeft: '3px solid #00A651', color: '#86efac' }}
        >
          <p className="font-black uppercase tracking-widest mb-1" style={{ fontSize: 10, color: '#00A651' }}>
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
