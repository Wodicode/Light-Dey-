import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { supabase } from '../supabaseClient.js';
import { useAuth } from '../App.jsx';

const tooltipStyle = {
  backgroundColor: '#1E293B',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  color: '#F8FAFC',
  fontSize: 12,
};

function BigStat({ label, value, color = '#F8FAFC', sub }) {
  return (
    <div
      className="rounded-card p-5 flex flex-col gap-1 relative overflow-hidden"
      style={{
        backgroundColor: '#1E293B',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.05)',
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: color, opacity: 0.8 }} />
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#475569' }}>{label}</p>
      <p className="text-4xl font-black tabular-nums leading-none" style={{ color }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{sub}</p>}
    </div>
  );
}

function DistributionBar({ data, color = '#2ECC71' }) {
  if (!data || data.length === 0) return <p className="text-xs" style={{ color: '#475569' }}>No data yet.</p>;
  const max = Math.max(...data.map(d => d.value));
  return (
    <div className="flex flex-col gap-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs font-semibold w-20 shrink-0 truncate" style={{ color: '#94A3B8' }}>
            {item.name}
          </span>
          <div className="flex-1 rounded-full overflow-hidden" style={{ backgroundColor: '#0F172A', height: 6 }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${max > 0 ? (item.value / max) * 100 : 0}%`,
                backgroundColor: color,
                transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
              }}
            />
          </div>
          <span className="text-xs font-black w-6 text-right tabular-nums" style={{ color: '#F8FAFC' }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Admin({ onBack }) {
  const { session } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Guard: must have is_admin in app_metadata
  const isAdmin = session?.user?.app_metadata?.is_admin === true;

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_admin_stats');
      if (error) {
        setError(error.message);
      } else {
        setStats(data);
      }
      setLoading(false);
    })();
  }, [isAdmin]);

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <p className="font-black text-textPrimary mb-1">Admin access only</p>
          <p className="text-xs text-textMuted">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 flex flex-col gap-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#475569' }}>
            Admin
          </p>
          <h1 className="text-xl font-black text-textPrimary">Dashboard</h1>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: 'rgba(46,204,113,0.12)', color: '#2ECC71', border: '1px solid rgba(46,204,113,0.2)' }}
        >
          Admin
        </span>
      </div>

      {error && (
        <div
          className="rounded-card px-4 py-3 text-xs font-medium"
          style={{ backgroundColor: '#E74C3C12', borderLeft: '3px solid #E74C3C', color: '#fca5a5' }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton rounded-card h-24" />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* ── Summary stats ── */}
          <div className="grid grid-cols-2 gap-3">
            <BigStat
              label="Total Users"
              value={stats.total_users ?? 0}
              color="#2ECC71"
              sub="signed up"
            />
            <BigStat
              label="Total Outages"
              value={stats.total_outages ?? 0}
              color="#94A3B8"
              sub="logged"
            />
            <BigStat
              label="Active Now"
              value={stats.active_outages ?? 0}
              color={stats.active_outages > 0 ? '#E74C3C' : '#475569'}
              sub="live outages"
            />
            <BigStat
              label="Profiles"
              value={stats.total_profiles ?? 0}
              color="#F39C12"
              sub="completed setup"
            />
          </div>

          {/* ── Signups per day ── */}
          <section
            className="rounded-card p-4"
            style={{ backgroundColor: '#1E293B', boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#475569' }}>
              Signups — Last 30 days
            </p>
            {stats.signups_by_day && stats.signups_by_day.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={stats.signups_by_day} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2535" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: '#475569', fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => v.slice(5)}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    formatter={v => [v, 'signups']}
                    labelFormatter={l => `Date: ${l}`}
                  />
                  <Bar dataKey="count" fill="#2ECC71" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-center py-6" style={{ color: '#475569' }}>No signups in the last 30 days.</p>
            )}
          </section>

          {/* ── Outages per day ── */}
          <section
            className="rounded-card p-4"
            style={{ backgroundColor: '#1E293B', boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#475569' }}>
              Outages Logged — Last 30 days
            </p>
            {stats.outages_by_day && stats.outages_by_day.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={stats.outages_by_day} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2535" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: '#475569', fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => v.slice(5)}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    formatter={v => [v, 'outages']}
                    labelFormatter={l => `Date: ${l}`}
                  />
                  <Bar dataKey="count" fill="#E74C3C" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-center py-6" style={{ color: '#475569' }}>No outages logged in the last 30 days.</p>
            )}
          </section>

          {/* ── DisCo + Band side by side ── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <section
              className="rounded-card p-4"
              style={{ backgroundColor: '#1E293B', boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#475569' }}>DisCo Breakdown</p>
              <DistributionBar data={stats.disco_distribution} color="#2ECC71" />
            </section>

            <section
              className="rounded-card p-4"
              style={{ backgroundColor: '#1E293B', boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#475569' }}>Service Band</p>
              <DistributionBar data={stats.band_distribution} color="#F39C12" />
            </section>
          </div>

          {/* ── Top areas ── */}
          {stats.top_areas && stats.top_areas.length > 0 && (
            <section
              className="rounded-card p-4"
              style={{ backgroundColor: '#1E293B', boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#475569' }}>
                Top Areas
              </p>
              <div className="flex flex-col gap-2">
                {stats.top_areas.map((a, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-textPrimary truncate">{a.area}</span>
                    <span className="text-xs font-black tabular-nums ml-2 shrink-0" style={{ color: '#94A3B8' }}>
                      {a.count} user{a.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Recent signups ── */}
          {stats.recent_users && stats.recent_users.length > 0 && (
            <section
              className="rounded-card overflow-hidden"
              style={{ backgroundColor: '#1E293B', boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }}
            >
              <p
                className="text-xs font-bold uppercase tracking-widest px-4 py-3"
                style={{ color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                Recent Signups
              </p>
              {stats.recent_users.map((u, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: i < stats.recent_users.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                >
                  <span className="text-sm text-textPrimary truncate">{u.email}</span>
                  <span className="text-xs ml-2 shrink-0" style={{ color: '#475569' }}>
                    {new Date(u.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
