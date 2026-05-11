import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient.js';
import { useProfile, useAuth } from '../App.jsx';
import { DISCO_INFO } from '../lib/calculations.js';
import { LGA_BY_STATE, LGA_STATES } from '../lib/nigeriaLGAs.js';

const DISCOS = ['AEDC', 'EKEDC', 'IE', 'PHED', 'EEDC', 'IBEDC', 'BeDE', 'KEDCO', 'KAEDCO', 'Other'];
const BANDS  = ['A', 'B', 'C', 'D', 'E'];

const inputClass = 'w-full px-3 py-2.5 rounded-btn text-sm text-textPrimary placeholder-textMuted/50 outline-none focus:ring-2 focus:ring-accent';
const inputStyle = { backgroundColor: '#0B0F1A', border: '1px solid rgba(255,255,255,0.1)' };
const labelClass = 'block text-sm font-medium text-textMuted mb-1';
const sectionStyle = { backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)' };
const dimText = { color: '#4A5470' };

function formatPhone(raw) {
  if (!raw) return null;
  return raw.replace(/^0/, '+234');
}

function formatWhatsApp(raw) {
  if (!raw) return null;
  return raw.replace(/^0/, '234');
}

function LGACombobox({ value, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const allLGAs = LGA_STATES.flatMap(state =>
    LGA_BY_STATE[state].map(lga => ({ ...lga, state }))
  );

  const lowerQuery = query.toLowerCase().trim();
  const filtered = lowerQuery
    ? allLGAs.filter(lga => lga.name.toLowerCase().includes(lowerQuery)).slice(0, 20)
    : allLGAs.slice(0, 20);

  const grouped = filtered.reduce((acc, lga) => {
    if (!acc[lga.state]) acc[lga.state] = [];
    acc[lga.state].push(lga);
    return acc;
  }, {});
  const groupedStates = Object.keys(grouped).sort();

  function handleSelect(lga) {
    onChange(lga.name);
    setQuery('');
    setOpen(false);
  }

  function handleInputChange(e) {
    setQuery(e.target.value);
    setOpen(true);
    if (!e.target.value) onChange('');
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        className={inputClass}
        style={inputStyle}
        type="text"
        placeholder="Search your LGA…"
        value={open ? query : value}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-btn overflow-y-auto"
          style={{ backgroundColor: '#0B0F1A', border: '1px solid rgba(255,255,255,0.1)', maxHeight: 200 }}
        >
          {groupedStates.length === 0 ? (
            <div className="px-3 py-2 text-sm" style={dimText}>No results</div>
          ) : (
            groupedStates.map(state => (
              <div key={state}>
                <div
                  className="px-3 py-1 text-xs font-semibold uppercase tracking-wide sticky top-0"
                  style={{ color: '#8B95B0', backgroundColor: '#0B0F1A' }}
                >
                  {state}
                </div>
                {grouped[state].map(lga => (
                  <button
                    key={lga.id}
                    type="button"
                    onMouseDown={() => handleSelect(lga)}
                    className="w-full text-left px-3 py-2 text-sm text-textPrimary hover:bg-white/5 transition-colors"
                  >
                    {lga.name}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SectionSaveButton({ saving, label }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="w-full py-3 rounded-btn font-semibold text-sm transition-opacity disabled:opacity-60 btn-glow"
      style={{ background: 'linear-gradient(180deg, #00A651 0%, #008f47 100%)', color: '#001a0f' }}
    >
      {saving ? 'Saving…' : label}
    </button>
  );
}

function PersonalSection({ profile, saveProfile, showToast, onSaved }) {
  const [form, setForm] = useState({ full_name: '', address: '', area: '', lga: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        address:   profile.address   || '',
        area:      profile.area      || '',
        lga:       profile.lga       || '',
      });
    }
  }, [profile]);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const result = await saveProfile({ full_name: form.full_name, address: form.address, area: form.area, lga: form.lga });
    setSaving(false);
    if (result.success) {
      showToast('Personal details saved ✓');
      if (onSaved) onSaved();
    }
  }

  return (
    <form onSubmit={handleSave} className="rounded-card p-4 flex flex-col gap-4" style={sectionStyle}>
      <h3
        className="text-sm font-black uppercase tracking-widest"
        style={{ color: '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}
      >
        Personal Details
      </h3>
      <div>
        <label className={labelClass}>Full Name</label>
        <input className={inputClass} style={inputStyle} type="text" placeholder="e.g. Amara Okafor" value={form.full_name} onChange={set('full_name')} />
        <p className="mt-1 text-xs" style={dimText}>Used only in your complaint letter — never shared or transmitted.</p>
      </div>
      <div>
        <label className={labelClass}>Street Address</label>
        <input className={inputClass} style={inputStyle} type="text" placeholder="e.g. 12 Okonkwo Street" value={form.address} onChange={set('address')} />
      </div>
      <div>
        <label className={labelClass}>Area / Neighbourhood</label>
        <input className={inputClass} style={inputStyle} type="text" placeholder="e.g. Gwarinpa, Abuja" value={form.area} onChange={set('area')} />
      </div>
      <div>
        <label className={labelClass}>
          Local Government Area (LGA)
          <span className="ml-2 text-xs font-normal" style={dimText}>used for the community map</span>
        </label>
        <LGACombobox value={form.lga} onChange={(val) => setForm(f => ({ ...f, lga: val }))} />
      </div>
      <SectionSaveButton saving={saving} label="Save Personal Details" />
    </form>
  );
}

function CommunitySection({ profile, saveProfile, showToast }) {
  const [communityOptIn, setCommunityOptIn] = useState(false);
  const [profileLga, setProfileLga] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setCommunityOptIn(profile.community_opt_in ?? false);
      setProfileLga(profile.lga || '');
    }
  }, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const result = await saveProfile({ community_opt_in: communityOptIn });
    setSaving(false);
    if (result.success) showToast('Community preference saved ✓');
  }

  return (
    <form onSubmit={handleSave} className="rounded-card p-4 flex flex-col gap-4" style={sectionStyle}>
      <h3
        className="text-sm font-black uppercase tracking-widest"
        style={{ color: '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}
      >
        Community Reporting
      </h3>
      <p className="text-xs leading-relaxed" style={dimText}>
        Contribute anonymised outage data to the community map. Only your LGA and daily outage minutes are shared — your name, address, and account details are never included.
      </p>
      <button
        type="button"
        role="switch"
        aria-checked={communityOptIn}
        onClick={() => setCommunityOptIn(v => !v)}
        className="flex items-center gap-3 text-left"
      >
        <div
          className="relative shrink-0 rounded-full transition-colors duration-200"
          style={{ width: 44, height: 24, backgroundColor: communityOptIn ? '#00A651' : 'rgba(255,255,255,0.1)' }}
        >
          <div
            className="absolute top-0.5 rounded-full transition-transform duration-200"
            style={{ width: 20, height: 20, backgroundColor: '#F0F4FF', transform: communityOptIn ? 'translateX(22px)' : 'translateX(2px)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-textPrimary">{communityOptIn ? 'Contributing anonymously' : 'Not contributing'}</p>
          <p className="text-xs" style={dimText}>{communityOptIn ? 'Your outage data helps others see area-wide patterns.' : 'Toggle to share your outage data anonymously.'}</p>
        </div>
      </button>
      {communityOptIn && !profileLga && (
        <p className="text-xs px-3 py-2 rounded-btn" style={{ backgroundColor: 'rgba(245,166,35,0.08)', color: '#fbbf24', border: '1px solid rgba(245,166,35,0.19)' }}>
          Save your LGA in Personal Details above to start contributing.
        </p>
      )}
      <SectionSaveButton saving={saving} label="Save Community Preference" />
    </form>
  );
}

function DiscoContactCard({ discoInfo }) {
  if (!discoInfo) return null;

  return (
    <div className="rounded-card p-4 flex flex-col gap-3" style={sectionStyle}>
      <h3
        className="text-sm font-black uppercase tracking-widest"
        style={{ color: '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}
      >
        {discoInfo.name}
      </h3>
      <address style={{ fontStyle: 'normal' }}>
        <dl className="flex flex-col gap-2">
          {discoInfo.phone && (
            <div>
              <dt className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#8B95B0' }}>Phone</dt>
              <dd className="text-sm text-textPrimary">
                <a href={`tel:${formatPhone(discoInfo.phone)}`} className="hover:underline">{discoInfo.phone}</a>
              </dd>
            </div>
          )}
          {discoInfo.whatsapp && discoInfo.whatsapp.length > 0 && (
            <div>
              <dt className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#8B95B0' }}>WhatsApp</dt>
              <dd className="text-sm text-textPrimary flex flex-col gap-0.5">
                {discoInfo.whatsapp.map(num => (
                  <a key={num} href={`https://wa.me/${formatWhatsApp(num)}`} className="hover:underline">{num}</a>
                ))}
              </dd>
            </div>
          )}
          {discoInfo.email && (
            <div>
              <dt className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#8B95B0' }}>Email</dt>
              <dd className="text-sm text-textPrimary">
                <a href={`mailto:${discoInfo.email}`} className="hover:underline">{discoInfo.email}</a>
              </dd>
            </div>
          )}
          {discoInfo.address && (
            <div>
              <dt className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#8B95B0' }}>Office Address</dt>
              <dd className="text-sm text-textPrimary">{discoInfo.address}</dd>
            </div>
          )}
          {discoInfo.complaintPortal && (
            <div>
              <dt className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#8B95B0' }}>Complaint Portal</dt>
              <dd className="text-sm">
                <a href={discoInfo.complaintPortal} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#00A651' }}>
                  {discoInfo.complaintPortal}
                </a>
              </dd>
            </div>
          )}
        </dl>
      </address>

      {discoInfo.nercForumOffice && (
        <>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#8B95B0' }}>NERC Forum Office</h4>
            <address style={{ fontStyle: 'normal' }}>
              <dl className="flex flex-col gap-2">
                {discoInfo.nercForumOffice.address && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#8B95B0' }}>Address</dt>
                    <dd className="text-sm text-textPrimary">{discoInfo.nercForumOffice.address}</dd>
                  </div>
                )}
                {discoInfo.nercForumOffice.phone && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#8B95B0' }}>Phone</dt>
                    <dd className="text-sm text-textPrimary">
                      <a href={`tel:${formatPhone(discoInfo.nercForumOffice.phone)}`} className="hover:underline">{discoInfo.nercForumOffice.phone}</a>
                    </dd>
                  </div>
                )}
                {discoInfo.nercForumOffice.email && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#8B95B0' }}>Email</dt>
                    <dd className="text-sm text-textPrimary">
                      <a href={`mailto:${discoInfo.nercForumOffice.email}`} className="hover:underline">{discoInfo.nercForumOffice.email}</a>
                    </dd>
                  </div>
                )}
              </dl>
            </address>
          </div>
        </>
      )}
    </div>
  );
}

function ElectricitySection({ profile, saveProfile, showToast }) {
  const [form, setForm] = useState({ disco: 'AEDC', service_band: 'A', meter_number: '', account_number: '' });
  const [saving, setSaving] = useState(false);
  const [bandInfoOpen, setBandInfoOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        disco:          profile.disco          || 'AEDC',
        service_band:   profile.service_band   || 'A',
        meter_number:   profile.meter_number   || '',
        account_number: profile.account_number || '',
      });
    }
  }, [profile]);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const result = await saveProfile({ disco: form.disco, service_band: form.service_band, meter_number: form.meter_number, account_number: form.account_number });
    setSaving(false);
    if (result.success) showToast('Electricity settings saved ✓');
  }

  const discoInfo = DISCO_INFO[form.disco];

  return (
    <>
      <form onSubmit={handleSave} className="rounded-card p-4 flex flex-col gap-4" style={sectionStyle}>
        <h3
          className="text-sm font-black uppercase tracking-widest"
          style={{ color: '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}
        >
          Electricity Account
        </h3>
        <div>
          <label className={labelClass}>Distribution Company (DisCo)</label>
          <select className={inputClass} style={inputStyle} value={form.disco} onChange={set('disco')}>
            {DISCOS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="text-sm font-medium text-textMuted">Service Band</label>
            <button
              type="button"
              onClick={() => setBandInfoOpen(v => !v)}
              aria-label="Service band information"
              className="flex items-center justify-center rounded-full text-xs font-bold shrink-0 transition-colors"
              style={{ width: 18, height: 18, border: '1px solid #4A5470', color: '#8B95B0', backgroundColor: 'transparent', lineHeight: 1 }}
            >
              i
            </button>
          </div>
          <select className={inputClass} style={inputStyle} value={form.service_band} onChange={set('service_band')}>
            {BANDS.map(b => <option key={b} value={b}>Band {b}</option>)}
          </select>
          {bandInfoOpen && (
            <div className="mt-2 px-3 py-2.5 rounded-btn text-xs leading-relaxed" style={{ backgroundColor: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.19)', color: '#fbbf24' }}>
              <p className="mb-1">Your DisCo is legally required to supply the minimum daily hours for your band. Missing the target means you're entitled to compensation under NERC regulations.</p>
              <p className="font-semibold">Band A: 20h/day | Band B: 16h | Band C: 12h | Band D: 8h | Band E: 4h</p>
            </div>
          )}
        </div>
        <div>
          <label className={labelClass}>Meter Number <span className="text-textMuted/50">(optional)</span></label>
          <input className={inputClass} style={inputStyle} type="text" placeholder="e.g. 0101123456789" value={form.meter_number} onChange={set('meter_number')} />
          <p className="mt-1 text-xs" style={dimText}>Helps personalise your complaint letter. Optional.</p>
        </div>
        <div>
          <label className={labelClass}>Account Number <span className="text-textMuted/50">(optional)</span></label>
          <input className={inputClass} style={inputStyle} type="text" placeholder="e.g. 1234567890" value={form.account_number} onChange={set('account_number')} />
          <p className="mt-1 text-xs" style={dimText}>Helps personalise your complaint letter. Optional.</p>
        </div>
        <SectionSaveButton saving={saving} label="Save Electricity Settings" />
      </form>

      <DiscoContactCard discoInfo={discoInfo} />
    </>
  );
}

export default function Settings({ onSaved }) {
  const { profile, saveProfile } = useProfile();
  const { showToast } = useAuth();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_account');
      if (error) throw error;
      await supabase.auth.signOut();
    } catch {
      showToast('Failed to delete account. Please contact support.');
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h2
        className="text-xl font-black text-textPrimary mb-6"
        style={{ fontFamily: 'Syne, system-ui, sans-serif' }}
      >
        Settings
      </h2>
      {!profile && (
        <div className="mb-4 px-4 py-3 rounded-btn text-sm" style={{ backgroundColor: 'rgba(245,166,35,0.13)', border: '1px solid #F5A623', color: '#fbbf24' }}>
          Complete your profile to get started with personalised tracking.
        </div>
      )}
      <div className="flex flex-col gap-4">
        <PersonalSection profile={profile} saveProfile={saveProfile} showToast={showToast} onSaved={onSaved} />
        <CommunitySection profile={profile} saveProfile={saveProfile} showToast={showToast} />
        <ElectricitySection profile={profile} saveProfile={saveProfile} showToast={showToast} />
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full py-3 rounded-btn font-semibold text-sm transition-opacity"
          style={{ backgroundColor: 'rgba(127,29,29,0.13)', border: '1px solid rgba(127,45,45,0.5)', color: '#fca5a5' }}
        >
          Sign Out
        </button>

        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="w-full py-3 rounded-btn font-semibold text-sm transition-opacity"
            style={{ backgroundColor: 'transparent', border: '1px solid rgba(127,45,45,0.3)', color: '#6B7280' }}
          >
            Delete Account
          </button>
        ) : (
          <div className="rounded-card p-4 flex flex-col gap-3" style={{ backgroundColor: 'rgba(127,29,29,0.13)', border: '1px solid rgba(200,50,50,0.4)' }}>
            <p className="text-sm font-semibold" style={{ color: '#fca5a5' }}>Permanently delete your account?</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              All your outage logs, profile data, and community reports will be erased. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-btn text-sm font-semibold"
                style={{ backgroundColor: '#1E293B', color: '#94A3B8', border: '1px solid #334155' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-btn text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: 'rgba(185,28,28,0.8)', color: '#fef2f2' }}
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
