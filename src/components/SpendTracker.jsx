import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, Cell,
} from 'recharts';
import { supabase } from '../supabaseClient.js';
import { useAuth } from '../App.jsx';

const PAGE_SIZE = 15;

function todayStr() {
  return new Date().toLocaleDateString('en-CA');
}

function fmtNaira(n) {
  return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtKWh(n) {
  return `${parseFloat(n).toFixed(1)} kWh`;
}

function daysBetween(dateA, dateB) {
  return Math.round((new Date(dateB + 'T00:00:00') - new Date(dateA + 'T00:00:00')) / 86400000);
}

function ChartTooltip({ active, payload, label, prefix = '', suffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor: '#1E293B', border: '1px solid #334155',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
    }}>
      <p style={{ color: '#94A3B8', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#2ECC71', fontWeight: 700 }}>
          {prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{suffix}
        </p>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color = '#2ECC71' }) {
  return (
    <div
      className="rounded-card p-3 flex flex-col"
      style={{ backgroundColor: '#1E293B', boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#475569' }}>{label}</p>
      <p className="text-lg font-black leading-tight" style={{ color }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{sub}</p>}
    </div>
  );
}

const inputSty = {
  backgroundColor: '#0a1120',
  border: '1px solid #334155',
  color: '#F8FAFC',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  width: '100%',
  outline: 'none',
};

export default function SpendTracker() {
  const { session } = useAuth();

  const [recharges, setRecharges] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(todayStr());
  const [formAmount, setFormAmount] = useState('');
  const [formKwh, setFormKwh] = useState('');
  const [formToken, setFormToken] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Pagination
  const [page, setPage] = useState(0);

  const fetchRecharges = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('recharges')
      .select('*')
      .eq('user_id', session.user.id)
      .order('recharge_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (!error) setRecharges(data || []);
    setLoading(false);
  }, [session]);

  useEffect(() => { fetchRecharges(); }, [fetchRecharges]);

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formAmount || parseFloat(formAmount) <= 0) {
      setFormError('Enter a valid amount greater than zero.');
      return;
    }
    setFormSaving(true);
    const { data, error } = await supabase
      .from('recharges')
      .insert({
        user_id: session.user.id,
        recharge_date: formDate,
        amount_naira: parseFloat(formAmount),
        kwh: formKwh ? parseFloat(formKwh) : null,
        token_number: formToken || null,
        notes: formNotes || null,
      })
      .select()
      .single();
    setFormSaving(false);
    if (error) { setFormError(error.message); return; }
    setRecharges(prev =>
      [data, ...prev].sort((a, b) =>
        b.recharge_date.localeCompare(a.recharge_date) ||
        b.created_at.localeCompare(a.created_at)
      )
    );
    setFormAmount(''); setFormKwh(''); setFormToken(''); setFormNotes('');
    setFormDate(todayStr()); setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this recharge record?')) return;
    await supabase.from('recharges').delete().eq('id', id);
    setRecharges(prev => prev.filter(r => r.id !== id));
  };

  const handleEditSave = async (id) => {
    const { data, error } = await supabase
      .from('recharges')
      .update({
        recharge_date: editForm.recharge_date,
        amount_naira: parseFloat(editForm.amount_naira),
        kwh: editForm.kwh ? parseFloat(editForm.kwh) : null,
        token_number: editForm.token_number || null,
        notes: editForm.notes || null,
      })
      .eq('id', id)
      .select()
      .single();
    if (!error) {
      setRecharges(prev =>
        prev.map(r => r.id === id ? data : r).sort((a, b) =>
          b.recharge_date.localeCompare(a.recharge_date) ||
          b.created_at.localeCompare(a.created_at)
        )
      );
      setEditingId(null);
    }
  };

  // ── Insights ──────────────────────────────────────────────────────────────

  const insights = useMemo(() => {
    if (recharges.length === 0) return null;

    const now = new Date();
    const thisMonth = now.toLocaleDateString('en-CA').slice(0, 7);

    const byMonth = {};
    recharges.forEach(r => {
      const m = r.recharge_date.slice(0, 7);
      if (!byMonth[m]) byMonth[m] = { month: m, totalAmount: 0, totalKwh: 0, count: 0 };
      byMonth[m].totalAmount += parseFloat(r.amount_naira) || 0;
      byMonth[m].totalKwh += parseFloat(r.kwh) || 0;
      byMonth[m].count++;
    });

    const monthlyData = Object.values(byMonth)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6)
      .map(m => ({
        ...m,
        label: new Date(m.month + '-01').toLocaleDateString('en-NG', { month: 'short', year: '2-digit' }),
      }));

    const thisMonthData = byMonth[thisMonth] || { totalAmount: 0, totalKwh: 0, count: 0 };

    const totalAmount = recharges.reduce((s, r) => s + (parseFloat(r.amount_naira) || 0), 0);
    const totalKwh = recharges.reduce((s, r) => s + (parseFloat(r.kwh) || 0), 0);
    const avgCostPerKwh = totalKwh > 0 ? totalAmount / totalKwh : null;

    const sorted = [...recharges].sort((a, b) => a.recharge_date.localeCompare(b.recharge_date));

    const gapList = [];
    for (let i = 1; i < sorted.length; i++) {
      const d = daysBetween(sorted[i - 1].recharge_date, sorted[i].recharge_date);
      if (d > 0 && d < 365) gapList.push(d);
    }
    const avgDaysBetween = gapList.length > 0
      ? gapList.reduce((s, d) => s + d, 0) / gapList.length
      : null;

    const daysBetweenChartData = sorted.slice(1).map((r, i) => {
      const days = daysBetween(sorted[i].recharge_date, r.recharge_date);
      return { label: r.recharge_date.slice(5), days: days > 0 && days < 365 ? days : null };
    }).filter(d => d.days !== null).slice(-12);

    const kwhChartData = sorted
      .filter(r => r.kwh)
      .map(r => ({ label: r.recharge_date.slice(5), kwh: parseFloat(r.kwh) }))
      .slice(-15);

    const costPerKwhTrend = sorted
      .filter(r => r.kwh && r.amount_naira)
      .map(r => ({
        label: r.recharge_date.slice(5),
        costPerKwh: Math.round(parseFloat(r.amount_naira) / parseFloat(r.kwh)),
      }))
      .slice(-12);

    let estDaysRemaining = null;
    let daysConsumed = null;
    const lastRecharge = sorted[sorted.length - 1];
    if (lastRecharge?.kwh && avgDaysBetween) {
      const avgKwhPerRecharge = totalKwh / recharges.length;
      const avgDailyConsumption = avgKwhPerRecharge / avgDaysBetween;
      daysConsumed = daysBetween(lastRecharge.recharge_date, todayStr());
      const kwhConsumed = avgDailyConsumption * daysConsumed;
      const kwhRemaining = Math.max(0, parseFloat(lastRecharge.kwh) - kwhConsumed);
      estDaysRemaining = Math.max(0, Math.round(kwhRemaining / avgDailyConsumption));
    }

    const habitsInsights = [];
    if (avgDaysBetween !== null) {
      habitsInsights.push(
        avgDaysBetween < 7
          ? `You recharge frequently — about every ${avgDaysBetween.toFixed(1)} days.`
          : avgDaysBetween < 14
            ? `Your recharge cycle is roughly ${avgDaysBetween.toFixed(1)} days — about weekly.`
            : `You recharge roughly every ${Math.round(avgDaysBetween)} days.`
      );
    }
    if (avgCostPerKwh !== null) {
      habitsInsights.push(`Your average electricity unit cost is ₦${avgCostPerKwh.toFixed(0)} per kWh across all recharges.`);
    }
    if (thisMonthData.totalAmount > 0) {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('en-CA').slice(0, 7);
      const prev = byMonth[prevMonth];
      if (prev?.totalAmount > 0) {
        const diff = thisMonthData.totalAmount - prev.totalAmount;
        const pct = Math.round(Math.abs(diff) / prev.totalAmount * 100);
        habitsInsights.push(
          diff > 0
            ? `This month's spend is ₦${Math.abs(diff).toLocaleString()} (+${pct}%) higher than last month.`
            : diff < 0
              ? `This month's spend is ₦${Math.abs(diff).toLocaleString()} (−${pct}%) lower than last month — well done.`
              : `Spend is about the same as last month.`
        );
      }
    }

    return {
      thisMonthData, totalAmount, totalKwh, avgCostPerKwh,
      avgDaysBetween, monthlyData, daysBetweenChartData,
      kwhChartData, costPerKwhTrend, estDaysRemaining,
      daysConsumed, lastRecharge, habitsInsights,
    };
  }, [recharges]);

  // Days-until-next map for history table
  const daysUntilNextMap = useMemo(() => {
    const m = {};
    const sorted = [...recharges].sort((a, b) => a.recharge_date.localeCompare(b.recharge_date));
    for (let i = 0; i < sorted.length - 1; i++) {
      m[sorted[i].id] = daysBetween(sorted[i].recharge_date, sorted[i + 1].recharge_date);
    }
    return m;
  }, [recharges]);

  const totalPages = Math.ceil(recharges.length / PAGE_SIZE);
  const pageRecharges = recharges.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const liveCostPerKwh = formAmount && formKwh && parseFloat(formKwh) > 0
    ? `₦${(parseFloat(formAmount) / parseFloat(formKwh)).toFixed(2)}/kWh`
    : null;

  return (
    <div className="flex flex-col gap-0 pb-24">
      {/* ── Header ── */}
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#475569' }}>Electricity</p>
          <h1 className="text-xl font-black text-textPrimary leading-none">Spend Tracker</h1>
          <p className="text-xs mt-1" style={{ color: '#475569' }}>Recharge history · Cost insights</p>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="btn-press flex items-center gap-2 px-4 py-2.5 rounded-btn text-sm font-black"
          style={{ background: 'linear-gradient(180deg, #2ECC71 0%, #27AE60 100%)', color: '#0a1a0f' }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Log
        </button>
      </div>

      {/* ── Log Form ── */}
      {showForm && (
        <div className="px-4 pb-4">
          <form
            onSubmit={handleSave}
            className="rounded-card p-4 flex flex-col gap-3"
            style={{ backgroundColor: '#1E293B', boxShadow: '0 0 0 1px rgba(46,204,113,0.18)' }}
          >
            <p className="text-sm font-black text-textPrimary">Log a Recharge</p>

            {formError && (
              <div className="text-xs px-3 py-2 rounded-btn" style={{ backgroundColor: '#E74C3C18', color: '#fca5a5', border: '1px solid #E74C3C40' }}>
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#475569' }}>Date</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={inputSty} required />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#475569' }}>Amount (₦)</label>
                <input type="number" min="1" step="any" placeholder="e.g. 5000" value={formAmount} onChange={e => setFormAmount(e.target.value)} style={inputSty} required />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#475569' }}>Units (kWh)</label>
                <input type="number" min="0.01" step="any" placeholder="e.g. 23.5" value={formKwh} onChange={e => setFormKwh(e.target.value)} style={inputSty} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#475569' }}>Token No.</label>
                <input type="text" placeholder="Optional" value={formToken} onChange={e => setFormToken(e.target.value)} style={inputSty} />
              </div>
            </div>

            {liveCostPerKwh && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-btn text-xs font-semibold" style={{ backgroundColor: 'rgba(46,204,113,0.08)', color: '#2ECC71' }}>
                ⚡ {liveCostPerKwh}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#475569' }}>Notes</label>
              <input type="text" placeholder="Optional" value={formNotes} onChange={e => setFormNotes(e.target.value)} style={inputSty} />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={formSaving}
                className="btn-press flex-1 py-2.5 rounded-btn text-sm font-black disabled:opacity-50"
                style={{ background: 'linear-gradient(180deg, #2ECC71 0%, #27AE60 100%)', color: '#0a1a0f' }}
              >
                {formSaving ? 'Saving…' : 'Save Recharge'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-press px-4 py-2.5 rounded-btn text-sm font-semibold"
                style={{ backgroundColor: '#0F172A', color: '#94A3B8', border: '1px solid #334155' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Insights ── */}
      {insights && (
        <>
          {/* Stat cards */}
          <div className="px-4 pb-3 grid grid-cols-2 gap-2">
            <StatCard
              label="This Month"
              value={fmtNaira(insights.thisMonthData.totalAmount)}
              sub={`${insights.thisMonthData.count} recharge${insights.thisMonthData.count !== 1 ? 's' : ''}`}
            />
            <StatCard
              label="Avg Cost/kWh"
              value={insights.avgCostPerKwh ? `₦${insights.avgCostPerKwh.toFixed(0)}` : '—'}
              sub="all time"
              color="#F39C12"
            />
            <StatCard
              label="Total kWh"
              value={insights.totalKwh > 0 ? fmtKWh(insights.totalKwh) : '—'}
              sub="all time"
              color="#94A3B8"
            />
            <StatCard
              label="Avg Cycle"
              value={insights.avgDaysBetween ? `${insights.avgDaysBetween.toFixed(1)}d` : '—'}
              sub="between recharges"
              color="#60A5FA"
            />
          </div>

          {/* Estimated days remaining */}
          {insights.estDaysRemaining !== null && insights.lastRecharge?.kwh && (
            <div className="px-4 pb-3">
              <div className="rounded-card p-4" style={{ backgroundColor: '#1E293B', boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#475569' }}>Est. Units Remaining</p>
                  <p className="text-sm font-black" style={{ color: insights.estDaysRemaining <= 3 ? '#E74C3C' : '#2ECC71' }}>
                    ~{insights.estDaysRemaining} day{insights.estDaysRemaining !== 1 ? 's' : ''}
                  </p>
                </div>
                {(() => {
                  const total = insights.avgDaysBetween || 7;
                  const pct = Math.min(100, Math.max(0, (insights.estDaysRemaining / total) * 100));
                  const barColor = pct > 50 ? '#2ECC71' : pct > 20 ? '#F39C12' : '#E74C3C';
                  return (
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#0F172A' }}>
                      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: 99, transition: 'width 0.5s ease' }} />
                    </div>
                  );
                })()}
                <p className="text-xs mt-1.5" style={{ color: '#475569' }}>
                  {insights.daysConsumed}d since last top-up · Based on your avg consumption
                </p>
              </div>
            </div>
          )}

          {/* Monthly spend chart */}
          {insights.monthlyData.length >= 2 && (
            <div className="px-4 pb-3">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>Monthly Spend</p>
              <div className="rounded-card p-3" style={{ backgroundColor: '#1E293B', boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }}>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={insights.monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} width={52}
                      tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltip prefix="₦" />} />
                    <Bar dataKey="totalAmount" radius={[4, 4, 0, 0]} maxBarSize={44}>
                      {insights.monthlyData.map((_, i) => (
                        <Cell key={i} fill={i === insights.monthlyData.length - 1 ? '#2ECC71' : '#1a3a2a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* kWh per recharge chart */}
          {insights.kwhChartData.length >= 2 && (
            <div className="px-4 pb-3">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>kWh per Recharge</p>
              <div className="rounded-card p-3" style={{ backgroundColor: '#1E293B', boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }}>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={insights.kwhChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} width={34}
                      tickFormatter={v => `${v}`} />
                    <Tooltip content={<ChartTooltip suffix=" kWh" />} />
                    <Bar dataKey="kwh" fill="#60A5FA" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Cost/kWh trend */}
          {insights.costPerKwhTrend.length >= 2 && (
            <div className="px-4 pb-3">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>Cost / kWh Trend</p>
              <div className="rounded-card p-3" style={{ backgroundColor: '#1E293B', boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }}>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={insights.costPerKwhTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#1a2a1f" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} width={42}
                      tickFormatter={v => `₦${v}`} />
                    <Tooltip content={<ChartTooltip prefix="₦" suffix="/kWh" />} />
                    <Line type="monotone" dataKey="costPerKwh" stroke="#F39C12" strokeWidth={2} dot={{ fill: '#F39C12', r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Days between recharges */}
          {insights.daysBetweenChartData.length >= 2 && (
            <div className="px-4 pb-3">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>Days Between Recharges</p>
              <div className="rounded-card p-3" style={{ backgroundColor: '#1E293B', boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }}>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={insights.daysBetweenChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} width={24}
                      tickFormatter={v => `${v}`} />
                    <Tooltip content={<ChartTooltip suffix=" days" />} />
                    <Bar dataKey="days" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Habit insights callout */}
          {insights.habitsInsights.length > 0 && (
            <div className="px-4 pb-3">
              <div
                className="rounded-card p-4"
                style={{ backgroundColor: '#1E293B', borderLeft: '3px solid #60A5FA', boxShadow: '0 0 0 1px rgba(96,165,250,0.12)' }}
              >
                <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#60A5FA' }}>Insights</p>
                {insights.habitsInsights.map((insight, i) => (
                  <p key={i} className="text-sm text-textPrimary leading-relaxed" style={{ marginBottom: i < insights.habitsInsights.length - 1 ? 6 : 0 }}>
                    {insight}
                  </p>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── History ── */}
      <div className="px-4 pb-3">
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#475569' }}>
          Recharge History{recharges.length > 0 ? ` (${recharges.length})` : ''}
        </p>

        {loading ? (
          <div className="rounded-card p-6 text-center" style={{ backgroundColor: '#1E293B' }}>
            <p className="text-sm" style={{ color: '#475569' }}>Loading…</p>
          </div>
        ) : recharges.length === 0 ? (
          <div className="rounded-card p-8 text-center" style={{ backgroundColor: '#1E293B', boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }}>
            <p className="text-3xl mb-3">💡</p>
            <p className="font-black text-textPrimary mb-1">No recharges logged yet</p>
            <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>
              Tap <span className="font-semibold text-textPrimary">+ Log</span> to record your first electricity token purchase.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-card overflow-hidden" style={{ backgroundColor: '#1E293B', boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }}>
              {pageRecharges.map((r, i) => {
                const isEditing = editingId === r.id;
                const costPerKwh = r.kwh && r.amount_naira
                  ? Math.round(parseFloat(r.amount_naira) / parseFloat(r.kwh))
                  : null;
                const daysUntil = daysUntilNextMap[r.id];
                const borderStyle = i < pageRecharges.length - 1
                  ? '1px solid rgba(255,255,255,0.04)'
                  : 'none';

                if (isEditing) {
                  return (
                    <div key={r.id} className="p-4 flex flex-col gap-2" style={{ borderBottom: borderStyle, backgroundColor: '#0F172A' }}>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold mb-1" style={{ color: '#475569' }}>Date</label>
                          <input type="date" value={editForm.recharge_date || ''} onChange={e => setEditForm(f => ({ ...f, recharge_date: e.target.value }))} style={{ ...inputSty, fontSize: 12, padding: '6px 10px' }} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1" style={{ color: '#475569' }}>Amount (₦)</label>
                          <input type="number" value={editForm.amount_naira || ''} onChange={e => setEditForm(f => ({ ...f, amount_naira: e.target.value }))} style={{ ...inputSty, fontSize: 12, padding: '6px 10px' }} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1" style={{ color: '#475569' }}>kWh</label>
                          <input type="number" value={editForm.kwh || ''} onChange={e => setEditForm(f => ({ ...f, kwh: e.target.value }))} style={{ ...inputSty, fontSize: 12, padding: '6px 10px' }} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1" style={{ color: '#475569' }}>Token No.</label>
                          <input type="text" value={editForm.token_number || ''} onChange={e => setEditForm(f => ({ ...f, token_number: e.target.value }))} style={{ ...inputSty, fontSize: 12, padding: '6px 10px' }} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: '#475569' }}>Notes</label>
                        <input type="text" value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inputSty, fontSize: 12, padding: '6px 10px' }} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditSave(r.id)} className="btn-press flex-1 py-2 rounded-btn text-xs font-black" style={{ background: 'linear-gradient(180deg, #2ECC71 0%, #27AE60 100%)', color: '#0a1a0f' }}>Save</button>
                        <button onClick={() => setEditingId(null)} className="btn-press px-3 py-2 rounded-btn text-xs font-semibold" style={{ backgroundColor: '#1E293B', color: '#94A3B8', border: '1px solid #334155' }}>Cancel</button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={r.id} className="px-4 py-3 flex items-start gap-3" style={{ borderBottom: borderStyle }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-textPrimary">{fmtNaira(r.amount_naira)}</p>
                        {r.kwh && <p className="text-xs font-semibold" style={{ color: '#60A5FA' }}>{fmtKWh(r.kwh)}</p>}
                        {costPerKwh && <p className="text-xs" style={{ color: '#475569' }}>₦{costPerKwh}/kWh</p>}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
                        {new Date(r.recharge_date + 'T00:00:00').toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        {daysUntil !== undefined && (
                          <span style={{ color: '#334155' }}> · lasted {daysUntil}d</span>
                        )}
                      </p>
                      {r.token_number && (
                        <p className="text-xs mt-0.5 font-mono tracking-wider" style={{ color: '#334155' }}>{r.token_number}</p>
                      )}
                      {r.notes && <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{r.notes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingId(r.id);
                          setEditForm({ recharge_date: r.recharge_date, amount_naira: r.amount_naira, kwh: r.kwh || '', token_number: r.token_number || '', notes: r.notes || '' });
                        }}
                        className="btn-press w-7 h-7 rounded flex items-center justify-center text-xs"
                        style={{ backgroundColor: '#334155', color: '#94A3B8' }}
                        title="Edit"
                      >✏</button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="btn-press w-7 h-7 rounded flex items-center justify-center text-xs"
                        style={{ backgroundColor: '#3B1519', color: '#E74C3C' }}
                        title="Delete"
                      >✕</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-3">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="btn-press px-3 py-1.5 rounded-btn text-xs font-semibold disabled:opacity-30"
                  style={{ backgroundColor: '#1E293B', color: '#94A3B8', border: '1px solid #334155' }}
                >← Prev</button>
                <span className="text-xs" style={{ color: '#475569' }}>{page + 1} / {totalPages}</span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="btn-press px-3 py-1.5 rounded-btn text-xs font-semibold disabled:opacity-30"
                  style={{ backgroundColor: '#1E293B', color: '#94A3B8', border: '1px solid #334155' }}
                >Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
