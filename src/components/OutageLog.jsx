import React, { useState, useEffect, useMemo } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp, Zap, ZapOff } from 'lucide-react';
import { useOutages } from '../App.jsx';
import { formatDuration, formatElapsedSeconds } from '../lib/calculations.js';

const inputClass = 'w-full px-3 py-2 rounded-btn text-sm text-textPrimary placeholder-textMuted/50 outline-none focus:ring-2 focus:ring-accent';
const inputStyle = { backgroundColor: '#0B0F1A', border: '1px solid rgba(255,255,255,0.1)' };

function todayLocal() {
  return new Date().toLocaleDateString('en-CA');
}

function formatTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m, 0);
  return d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatOutageDate(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('en-NG', { month: 'long', day: 'numeric', year: 'numeric' });
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
}

function groupByMonth(outages) {
  const map = new Map();
  for (const o of outages) {
    const k = monthKey(o.date);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(o);
  }
  return Array.from(map.entries()).map(([key, records]) => ({ key, label: monthLabel(key), records }));
}

export default function OutageLog() {
  const { outages, activeOutage, startOutage, endOutage, addManualOutage, updateOutage, deleteOutage, confirmations, addConfirmation } = useOutages();

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!activeOutage) { setElapsed(0); return; }
    const compute = () => {
      const now = new Date();
      const [h, m, s = 0] = activeOutage.start_time.split(':').map(Number);
      const parts = activeOutage.date.split('-').map(Number);
      const start = new Date(parts[0], parts[1] - 1, parts[2], h, m, s);
      setElapsed(Math.max(0, Math.floor((now - start) / 1000)));
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [activeOutage]);

  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ date: todayLocal(), start_time: '', end_time: '', notes: '' });
  const [manualSaving, setManualSaving] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);

  const [collapsedMonths, setCollapsedMonths] = useState({});

  const monthGroups = useMemo(() => groupByMonth(outages), [outages]);

  const today = todayLocal();
  const todayConfirmed = (confirmations || []).some(c => c.date === today);
  const todayHasOutage = outages.some(o => o.date === today);

  const setManual = (key) => (e) => setManualForm(f => ({ ...f, [key]: e.target.value }));
  const setEdit = (key) => (e) => setEditForm(f => ({ ...f, [key]: e.target.value }));

  const submitManual = async (e) => {
    e.preventDefault();
    setManualSaving(true);
    const payload = {
      date: manualForm.date,
      start_time: manualForm.start_time,
      notes: manualForm.notes || null,
      is_active: !manualForm.end_time,
    };
    if (manualForm.end_time) payload.end_time = manualForm.end_time;
    const result = await addManualOutage(payload);
    setManualSaving(false);
    if (result.success) {
      setManualForm({ date: todayLocal(), start_time: '', end_time: '', notes: '' });
      setShowManual(false);
    }
  };

  const startEdit = (outage) => {
    setEditId(outage.id);
    setEditForm({
      date: outage.date,
      start_time: outage.start_time,
      end_time: outage.end_time || '',
      notes: outage.notes || '',
    });
  };

  const saveEdit = async (id) => {
    const result = await updateOutage(id, {
      date: editForm.date,
      start_time: editForm.start_time,
      end_time: editForm.end_time || null,
      notes: editForm.notes || null,
      is_active: !editForm.end_time,
    });
    if (result.success) setEditId(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteOutage(deleteTarget);
    setDeleteTarget(null);
  };

  const toggleMonth = (key) => {
    setCollapsedMonths(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="px-4 py-6 flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        {activeOutage ? (
          <>
            <div
              className="rounded-card px-4 py-4 flex items-center gap-3"
              style={{ backgroundColor: '#111827', border: '1px solid rgba(229,57,53,0.35)' }}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0 blink"
                style={{ backgroundColor: '#E53935' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#E53935' }}>
                  Outage in progress
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#4A5470' }}>
                  Since {formatOutageDate(activeOutage.date)} at {formatTime(activeOutage.start_time)}
                </p>
              </div>
              <p
                className="text-2xl font-black tabular-nums leading-none tracking-tight shrink-0"
                style={{ color: '#E53935', fontFamily: 'Syne, system-ui, sans-serif' }}
                aria-live="polite"
              >
                {formatElapsedSeconds(elapsed)}
              </p>
            </div>
            <button
              onClick={endOutage}
              className="btn-restore w-full py-6 rounded-card font-black text-xl tracking-widest uppercase btn-glow"
              style={{ background: 'linear-gradient(180deg, #00A651 0%, #008f47 100%)', color: '#001a0f' }}
            >
              <span className="flex items-center justify-center gap-3">
                <Zap size={22} strokeWidth={2.5} />
                LIGHT IS BACK
              </span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={startOutage}
              className="btn-outage w-full py-6 rounded-card font-black text-xl tracking-widest uppercase text-white"
              style={{ background: 'linear-gradient(180deg, #E53935 0%, #c62828 100%)' }}
            >
              <span className="flex items-center justify-center gap-3">
                <ZapOff size={22} strokeWidth={2.5} />
                LIGHT IS OFF
              </span>
            </button>
            <p className="text-xs text-center" style={{ color: '#4A5470' }}>
              Tap to start timing this outage.
            </p>
          </>
        )}
      </section>

      {!activeOutage && (
        <button
          onClick={() => setShowManual(v => !v)}
          className="w-full py-2.5 px-4 rounded-btn text-sm font-semibold flex items-center justify-center gap-2"
          style={{ border: '1px solid rgba(0,166,81,0.4)', color: '#00A651', backgroundColor: 'transparent' }}
        >
          Log a past outage manually
          {showManual ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      )}

      {!activeOutage && !todayHasOutage && (
        todayConfirmed ? (
          <div
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-btn text-sm"
            style={{ backgroundColor: 'rgba(0,166,81,0.06)', border: '1px solid rgba(0,166,81,0.2)', color: '#4A5470' }}
          >
            <span style={{ color: '#00A651' }}>✓</span> No outage today — streak maintained
          </div>
        ) : (
          <button
            onClick={() => addConfirmation(today)}
            className="w-full py-2.5 px-4 rounded-btn text-sm font-semibold flex items-center justify-center gap-2"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#8B95B0', backgroundColor: 'transparent' }}
          >
            No outage today — confirm to keep streak
          </button>
        )
      )}

      {showManual && !activeOutage && (
        <form
          onSubmit={submitManual}
          className="rounded-card p-4 flex flex-col gap-3"
          style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wide">Log Past Outage</h3>
          <div>
            <label className="block text-xs text-textMuted mb-1">Date</label>
            <input className={inputClass} style={inputStyle} type="date" required value={manualForm.date} onChange={setManual('date')} />
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-textMuted mb-1">Start Time</label>
              <input className={inputClass} style={inputStyle} type="time" required value={manualForm.start_time} onChange={setManual('start_time')} />
            </div>
            <div>
              <label className="block text-xs text-textMuted mb-1">
                Restored At <span className="text-textMuted/50">(leave blank if still active)</span>
              </label>
              <input className={inputClass} style={inputStyle} type="time" value={manualForm.end_time} onChange={setManual('end_time')} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-textMuted mb-1">Notes <span className="text-textMuted/50">(optional)</span></label>
            <input className={inputClass} style={inputStyle} type="text" placeholder="e.g. PHCN van spotted" value={manualForm.notes} onChange={setManual('notes')} />
          </div>
          <button
            type="submit"
            disabled={manualSaving}
            className="py-2.5 rounded-btn font-semibold text-sm disabled:opacity-60 btn-glow"
            style={{ backgroundColor: '#00A651', color: '#001a0f' }}
          >
            {manualSaving ? 'Saving…' : 'Log Outage'}
          </button>
        </form>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-sm font-black uppercase tracking-widest"
            style={{ color: '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}
          >
            Outage History
          </h3>
          <span className="text-xs text-textMuted">{outages.length} record{outages.length !== 1 ? 's' : ''}</span>
        </div>

        {outages.length === 0 ? (
          <div
            className="rounded-card p-8 text-center text-textMuted text-sm"
            style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            No outages logged yet. Tap "LIGHT IS OFF" when power goes out.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {monthGroups.map(({ key, label, records }) => {
              const collapsed = !!collapsedMonths[key];
              return (
                <div key={key} className="rounded-card overflow-hidden" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <button
                    onClick={() => toggleMonth(key)}
                    className="w-full flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <span className="text-sm font-semibold text-textPrimary">
                      {label}
                      <span className="ml-2 text-xs font-normal text-textMuted">
                        · {records.length} record{records.length !== 1 ? 's' : ''}
                      </span>
                    </span>
                    {collapsed ? <ChevronDown size={16} style={{ color: '#8B95B0' }} /> : <ChevronUp size={16} style={{ color: '#8B95B0' }} />}
                  </button>

                  {!collapsed && records.map((outage, idx) => (
                    <div key={outage.id}>
                      {editId === outage.id ? (
                        <div
                          className="p-4 flex flex-col gap-3"
                          style={{ borderBottom: idx < records.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-textMuted mb-1">Date</label>
                              <input className={inputClass} style={inputStyle} type="date" value={editForm.date} onChange={setEdit('date')} />
                            </div>
                            <div>
                              <label className="block text-xs text-textMuted mb-1">Start Time</label>
                              <input className={inputClass} style={inputStyle} type="time" value={editForm.start_time} onChange={setEdit('start_time')} />
                            </div>
                            <div>
                              <label className="block text-xs text-textMuted mb-1">End Time</label>
                              <input className={inputClass} style={inputStyle} type="time" value={editForm.end_time} onChange={setEdit('end_time')} />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-textMuted mb-1">Notes <span className="text-textMuted/50">(optional)</span></label>
                            <textarea
                              className={inputClass}
                              style={{ ...inputStyle, resize: 'none' }}
                              rows={2}
                              maxLength={200}
                              value={editForm.notes}
                              onChange={setEdit('notes')}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(outage.id)}
                              className="flex-1 py-2 rounded-btn text-sm font-semibold btn-glow"
                              style={{ backgroundColor: '#00A651', color: '#001a0f' }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditId(null)}
                              className="flex-1 py-2 rounded-btn text-sm font-medium"
                              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#F0F4FF' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="flex items-start px-4 py-3 gap-3"
                          style={{ borderBottom: idx < records.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-medium text-textPrimary">
                                {formatOutageDate(outage.date)}
                              </span>
                              <span className="text-xs text-textMuted">·</span>
                              <span className="text-xs text-textMuted">
                                {formatTime(outage.start_time)}
                                {' – '}
                                {outage.is_active ? (
                                  <span className="font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(229,57,53,0.13)', color: '#E53935', border: '1px solid rgba(229,57,53,0.35)' }}>
                                    Active
                                  </span>
                                ) : (
                                  formatTime(outage.end_time) || '—'
                                )}
                              </span>
                              {!outage.is_active && outage.duration_minutes != null && (
                                <>
                                  <span className="text-xs text-textMuted">·</span>
                                  <span className="text-xs text-textMuted">{formatDuration(outage.duration_minutes)}</span>
                                </>
                              )}
                            </div>
                            {outage.notes && (
                              <p className="text-xs mt-0.5 truncate" style={{ color: '#4A5470' }}>
                                · {outage.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0 mt-0.5">
                            <button
                              onClick={() => startEdit(outage)}
                              className="p-1.5 rounded"
                              style={{ color: '#8B95B0' }}
                              aria-label="Edit outage record"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(outage.id)}
                              className="p-1.5 rounded"
                              style={{ color: '#E53935' }}
                              aria-label="Delete outage record"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="rounded-card p-6 w-full max-w-sm flex flex-col gap-4"
            style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-base font-semibold text-textPrimary">Delete outage record?</p>
              <p className="text-sm mt-1" style={{ color: '#8B95B0' }}>This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-btn text-sm font-medium"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#F0F4FF' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-btn text-sm font-semibold text-white"
                style={{ backgroundColor: '#E53935' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
