import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { useProfile, useAuth } from '../App.jsx';
import { DISCO_INFO } from '../lib/calculations.js';

const DISCOS = ['AEDC', 'EKEDC', 'IE', 'PHED', 'EEDC', 'IBEDC', 'Other'];
const BANDS = ['A', 'B', 'C', 'D', 'E'];

const inputClass =
  'w-full px-3 py-2.5 rounded-btn text-sm text-textPrimary placeholder-textMuted/50 outline-none focus:ring-2 focus:ring-accent';
const inputStyle = { backgroundColor: '#0F172A', border: '1px solid #334155' };
const labelClass = 'block text-sm font-medium text-textMuted mb-1';

export default function Settings({ onSaved }) {
  const { profile, saveProfile } = useProfile();
  const { session, showToast } = useAuth();

  const [form, setForm] = useState({
    full_name: '',
    address: '',
    area: '',
    disco: 'AEDC',
    service_band: 'A',
    meter_number: '',
    account_number: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        address: profile.address || '',
        area: profile.area || '',
        disco: profile.disco || 'AEDC',
        service_band: profile.service_band || 'A',
        meter_number: profile.meter_number || '',
        account_number: profile.account_number || '',
      });
    }
  }, [profile]);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await saveProfile(form);
    setSaving(false);
    if (result.success && onSaved) onSaved();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const discoInfo = DISCO_INFO[form.disco];

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-textPrimary mb-6">Settings</h2>

      {!profile && (
        <div className="mb-4 px-4 py-3 rounded-btn text-sm" style={{ backgroundColor: '#F39C1222', border: '1px solid #F39C12', color: '#fbbf24' }}>
          Complete your profile to get started with personalised tracking.
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        {/* Personal */}
        <section className="rounded-card p-4 flex flex-col gap-4" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
          <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wide">Personal Details</h3>
          <div>
            <label className={labelClass}>Full Name</label>
            <input className={inputClass} style={inputStyle} type="text" placeholder="e.g. Amara Okafor" value={form.full_name} onChange={set('full_name')} />
          </div>
          <div>
            <label className={labelClass}>Street Address</label>
            <input className={inputClass} style={inputStyle} type="text" placeholder="e.g. 12 Okonkwo Street" value={form.address} onChange={set('address')} />
          </div>
          <div>
            <label className={labelClass}>Area / Neighbourhood</label>
            <input className={inputClass} style={inputStyle} type="text" placeholder="e.g. Gwarinpa, Abuja" value={form.area} onChange={set('area')} />
          </div>
        </section>

        {/* Electricity account */}
        <section className="rounded-card p-4 flex flex-col gap-4" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
          <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wide">Electricity Account</h3>
          <div>
            <label className={labelClass}>Distribution Company (DisCo)</label>
            <select className={inputClass} style={inputStyle} value={form.disco} onChange={set('disco')}>
              {DISCOS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Service Band
              <span className="ml-2 text-xs text-textMuted/70 font-normal">
                (A = 20h/day, B = 16h, C = 12h, D = 8h, E = 4h)
              </span>
            </label>
            <select className={inputClass} style={inputStyle} value={form.service_band} onChange={set('service_band')}>
              {BANDS.map(b => <option key={b} value={b}>Band {b}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Meter Number <span className="text-textMuted/50">(optional)</span></label>
            <input className={inputClass} style={inputStyle} type="text" placeholder="e.g. 0101123456789" value={form.meter_number} onChange={set('meter_number')} />
          </div>
          <div>
            <label className={labelClass}>Account Number <span className="text-textMuted/50">(optional)</span></label>
            <input className={inputClass} style={inputStyle} type="text" placeholder="e.g. 1234567890" value={form.account_number} onChange={set('account_number')} />
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-btn font-semibold text-sm transition-opacity disabled:opacity-60"
          style={{ backgroundColor: '#2ECC71', color: '#0F172A' }}
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>

      {/* DisCo contact card */}
      {discoInfo && (
        <section className="mt-6 rounded-card p-4" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
          <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wide mb-3">DisCo Contact Details</h3>
          <p className="text-textPrimary font-medium text-sm mb-3">{discoInfo.name}</p>
          <div className="flex flex-col gap-2 text-sm">
            {discoInfo.phone && (
              <div className="flex gap-2">
                <span className="text-textMuted w-24 shrink-0">Phone:</span>
                <span className="text-textPrimary">{discoInfo.phone}</span>
              </div>
            )}
            {discoInfo.whatsapp && (
              <div className="flex gap-2">
                <span className="text-textMuted w-24 shrink-0">WhatsApp:</span>
                <span className="text-textPrimary">{discoInfo.whatsapp.join(', ')}</span>
              </div>
            )}
            {discoInfo.email && (
              <div className="flex gap-2">
                <span className="text-textMuted w-24 shrink-0">Email:</span>
                <a href={`mailto:${discoInfo.email}`} className="text-accent break-all hover:underline">{discoInfo.email}</a>
              </div>
            )}
            {discoInfo.complaintPortal && (
              <div className="flex gap-2">
                <span className="text-textMuted w-24 shrink-0">Portal:</span>
                <a href={discoInfo.complaintPortal} target="_blank" rel="noopener noreferrer" className="text-accent break-all hover:underline">{discoInfo.complaintPortal}</a>
              </div>
            )}
            {discoInfo.address && (
              <div className="flex gap-2">
                <span className="text-textMuted w-24 shrink-0">Address:</span>
                <span className="text-textPrimary">{discoInfo.address}</span>
              </div>
            )}
          </div>
          {discoInfo.nercForumOffice && (
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid #334155' }}>
              <p className="text-xs font-semibold text-textMuted uppercase tracking-wide mb-2">NERC Forum Office</p>
              <div className="flex flex-col gap-1.5 text-sm">
                {discoInfo.nercForumOffice.address && (
                  <div className="flex gap-2">
                    <span className="text-textMuted w-24 shrink-0">Address:</span>
                    <span className="text-textPrimary">{discoInfo.nercForumOffice.address}</span>
                  </div>
                )}
                {discoInfo.nercForumOffice.phone && (
                  <div className="flex gap-2">
                    <span className="text-textMuted w-24 shrink-0">Phone:</span>
                    <span className="text-textPrimary">{discoInfo.nercForumOffice.phone}</span>
                  </div>
                )}
                {discoInfo.nercForumOffice.email && (
                  <div className="flex gap-2">
                    <span className="text-textMuted w-24 shrink-0">Email:</span>
                    <a href={`mailto:${discoInfo.nercForumOffice.email}`} className="text-accent hover:underline">{discoInfo.nercForumOffice.email}</a>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Sign out */}
      <div className="mt-6">
        <button
          onClick={handleSignOut}
          className="w-full py-3 rounded-btn font-semibold text-sm transition-opacity"
          style={{ backgroundColor: '#7f1d1d22', border: '1px solid #7f2d2d', color: '#fca5a5' }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
