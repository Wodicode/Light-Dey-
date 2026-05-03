import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp, Zap, ZapOff } from 'lucide-react';
import { useOutages } from '../App.jsx';
import { formatDuration, formatElapsedSeconds } from '../lib/calculations.js';

const PAGE_SIZE = 20;

const inputClass = 'w-full px-3 py-2 rounded-btn text-sm text-textPrimary placeholder-textMuted/50 outline-none focus:ring-2 focus:ring-accent';
const inputStyle = { backgroundColor: '#0F172A', border: '1px solid #334155' };

function todayLocal() {
  return new Date().toLocaleDateString('en-CA');
}
function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
}

export default function OutageLog() {
  const { outages, activeOutage, startOutage, endOutage, addManualOutage, updateOutage, deleteOutage } = useOutages();

  // Live timer for active outage
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!activeOutage) { setElapsed(0); return; }
    const compute = () => {
      const now = new Date();
      const [h, m] = activeOutage.start_time.split(':').map(Number);
      const parts = activeOutage.date.split('-').map(Number);
      const start = new Date(parts[0], parts[1] - 1, parts[2], h, m, 0);
      setElapsed(Math.max(0, Math.floor((now - start) / 1000)));
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [activeOutage]);

  // Manual form
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ date: todayLocal(), start_time: '', end_time: '', notes: '' });
  const [manualSaving, setManualSaving] = useState(false);

  // Edit state
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Pagination
  const [page, setPage] = useState(0);

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

  const confirmDelete = async (id) => {
    await deleteOutage(id);
    setDeleteConfirm(null);
  };

  const totalPages = Math.ceil(outages.length / PAGE_SIZE);
  const pageOutages = outages.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="px-4 py-6 flex flex-col gap-6">
      {/* Quick-tap section */}
      <section className="flex flex-col gap-4">
        {activeOutage ? (
          <>
            {/* Live timer */}
            <div
              className="rounded-card px-4 py-5 text-center"
              style={{
                backgroundColor: '#1E293B',
                boxShadow: '0 0 0 1px rgba(231,76,60,0.2), 0 0 32px rgba(231,76,60,0.08)',
              }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#E74C3C' }}>
                ● Outage in progress
              </p>
              <p
                className="text-5xl font-black tabular-nums leading-none tracking-tight"
                style={{ color: '#E74C3C' }}
              >
                {formatElapsedSeconds(elapsed)}
              </p>
              <p className="text-xs mt-3" style={{ color: '#475569' }}>
                Since {activeOutage.date} at {activeOutage.start_time}
              </p>
            </div>

            <button
              onClick={endOutage}
              className="btn-restore w-full py-6 rounded-card font-black text-xl tracking-widest uppercase"
              style={{
                background: 'linear-gradient(180deg, #2ECC71 0%, #27AE60 100%)',
                color: '#0a1a0f',
              }}
            >
              <span className="flex items-center justify-center gap-3">
                <Zap size={22} strokeWidth={2.5} />
                LIGHT IS BACK
              </span>
            </button>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold text-center uppercase tracking-widest" style={{ color: '#475569' }}>
              Power went out? Tap to start tracking.
            </p>
            <button
              onClick={startOutage}
              className="btn-outage w-full py-6 rounded-card font-black text-xl tracking-widest uppercase text-white"
              style={{
                background: 'linear-gradient(180deg, #E74C3C 0%, #C0392B 100%)',
              }}
            >
              <span className="flex items-center justify-center gap-3">
                <ZapOff size={22} strokeWidth={2.5} />
                LIGHT IS OFF
              </span>
            </button>
          </>
        )}
      </section>

      {/* Manual entry toggle */}
      {!activeOutage && (
        <div>
          <button
            onClick={() => setShowManual(v => !v)}
            className="flex items-center gap-1 text-sm font-medium mx-auto"
            style={{ color: '#2ECC71' }}
          >
            Log past outage
            {showManual ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      )}

      {showManual && !activeOutage && (
        <form onSubmit={submitManual} className="rounded-card p-4 flex flex-col gap-3" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
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
            className="py-2.5 rounded-btn font-semibold text-sm disabled:opacity-60"
            style={{ backgroundColor: '#2ECC71', color: '#0F172A' }}
          >
            {manualSaving ? 'Saving…' : 'Log Outage'}
          </button>
        </form>
      )}

      {/* Outage log table */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wide">Outage History</h3>
          <span className="text-xs text-textMuted">{outages.length} record{outages.length !== 1 ? 's' : ''}</span>
        </div>

        {outages.length === 0 ? (
          <div className="rounded-card p-8 text-center text-textMuted text-sm" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            No outages logged yet. Tap "LIGHT IS OFF" when power goes out.
          </div>
        ) : (
          <div className="rounded-card overflow-hidden" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            {pageOutages.map((outage, idx) => (
              <div key={outage.id}>
                {editId === outage.id ? (
                  <div className="p-4 flex flex-col gap-3">
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
                      <div>
                        <label className="block text-xs text-textMuted mb-1">Notes</label>
                        <input className={inputClass} style={inputStyle} type="text" value={editForm.notes} onChange={setEdit('notes')} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(outage.id)} className="flex-1 py-2 rounded-btn text-sm font-semibold" style={{ backgroundColor: '#2ECC71', color: '#0F172A' }}>Save</button>
                      <button onClick={() => setEditId(null)} className="flex-1 py-2 rounded-btn text-sm font-medium" style={{ backgroundColor: '#334155', color: '#F8FAFC' }}>Cancel</button>
                    </div>
                  </div>
                ) : deleteConfirm === outage.id ? (
                  <div className="p-4 flex flex-col gap-2">
                    <p className="text-sm text-textPrimary">Delete this outage record?</p>
                    <div className="flex gap-2">
                      <button onClick={() => confirmDelete(outage.id)} className="flex-1 py-2 rounded-btn text-sm font-semibold text-white" style={{ backgroundColor: '#E74C3C' }}>Delete</button>
                      <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 rounded-btn text-sm font-medium" style={{ backgroundColor: '#334155', color: '#F8FAFC' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center px-4 py-3 gap-3" style={{ borderBottom: idx < pageOutages.length - 1 ? '1px solid #334155' : 'none' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-textPrimary">{outage.date}</span>
                        <span className="text-xs text-textMuted">{outage.start_time}</span>
                        <span className="text-xs text-textMuted">→</span>
                        {outage.is_active ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E74C3C22', color: '#E74C3C', border: '1px solid #E74C3C55' }}>
                            Active
                          </span>
                        ) : (
                          <span className="text-xs text-textMuted">{outage.end_time || '—'}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-textMuted">{formatDuration(outage.duration_minutes)}</span>
                        {outage.notes && <span className="text-xs text-textMuted/70 truncate">· {outage.notes}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => startEdit(outage)} className="p-1.5 rounded" style={{ color: '#94A3B8' }} aria-label="Edit">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setDeleteConfirm(outage.id)} className="p-1.5 rounded" style={{ color: '#E74C3C' }} aria-label="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-3">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-1.5 rounded-btn text-sm disabled:opacity-40"
              style={{ backgroundColor: '#1E293B', border: '1px solid #334155', color: '#F8FAFC' }}
            >
              Previous
            </button>
            <span className="text-sm text-textMuted">Page {page + 1} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-4 py-1.5 rounded-btn text-sm disabled:opacity-40"
              style={{ backgroundColor: '#1E293B', border: '1px solid #334155', color: '#F8FAFC' }}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
