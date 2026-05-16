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
    const result = await saveProfile({
      full_name: form.full_name,
      address:   form.address,
      area:      form.area,
      lga:       form.lga,
    });
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

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp Bot Section
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalise a Nigerian phone number to the E.164 digits format WhatsApp uses
 * as the sender `from` field (no leading +).
 * Accepts: 08012345678 | +2348012345678 | 2348012345678
 * Returns: 2348012345678
 */
function normaliseNigerianPhone(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length >= 13) return digits;
  if (digits.startsWith('0') && digits.length === 11) return '234' + digits.slice(1);
  // Already in international format without the country code prefix
  if (digits.length === 10) return '234' + digits;
  return digits;
}

function WhatsAppSection({ profile, saveProfile, showToast }) {
  const [phone, setPhone]   = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setPhone(profile.whatsapp_number || '');
  }, [profile]);

  const normalised = normaliseNigerianPhone(phone);
  // Valid if it resolves to a 13-digit Nigerian number (234 + 10 digits)
  const isValid = normalised.startsWith('234') && normalised.length === 13;

  async function handleSave(e) {
    e.preventDefault();
    if (phone && !isValid) {
      showToast('Enter a valid Nigerian mobile number (e.g. 08012345678).', 'error');
      return;
    }
    setSaving(true);
    const result = await saveProfile({ whatsapp_number: phone ? normalised : null });
    setSaving(false);
    if (result.success) showToast('WhatsApp number saved ✓');
  }

  async function handleRemove() {
    setSaving(true);
    const result = await saveProfile({ whatsapp_number: null });
    setSaving(false);
    if (result.success) {
      setPhone('');
      showToast('WhatsApp number removed.');
    }
  }

  // Deep-link opens a chat to the PowerWatch bot number with a pre-filled message
  const testLink = isValid
    ? `https://wa.me/${normalised}?text=help`
    : null;

  return (
    <form onSubmit={handleSave} className="rounded-card p-4 flex flex-col gap-4" style={sectionStyle}>
      {/* Section header */}
      <div className="flex items-center gap-2">
        {/* WhatsApp wordmark icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652C8.094 23.333 10.05 23.84 12.045 23.84h.006c6.584 0 11.943-5.334 11.944-11.893.001-3.181-1.24-6.17-3.475-8.498z" fill="#25D366"/>
          <path d="M12.045 21.785h-.005a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.977.999-3.638-.235-.373a9.793 9.793 0 0 1-1.507-5.266c.002-5.42 4.427-9.831 9.884-9.831 2.64 0 5.122 1.024 6.99 2.882a9.77 9.77 0 0 1 2.897 6.952c-.003 5.421-4.427 9.889-9.89 9.889zm5.422-7.403c-.297-.148-1.757-.864-2.031-.963-.273-.099-.472-.148-.671.149-.198.297-.769.963-.942 1.161-.174.198-.347.223-.644.074-.297-.148-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.457.13-.605.134-.133.297-.347.446-.521.149-.174.198-.297.298-.495.099-.198.05-.372-.025-.521-.074-.148-.671-1.613-.919-2.209-.242-.58-.487-.501-.671-.51a12.06 12.06 0 0 0-.571-.01c-.198 0-.521.074-.793.372-.272.297-1.04 1.016-1.04 2.479 0 1.463 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#fff"/>
        </svg>
        <h3
          className="text-sm font-black uppercase tracking-widest"
          style={{ color: '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}
        >
          WhatsApp Bot
        </h3>
      </div>

      <p className="text-xs leading-relaxed" style={dimText}>
        Link your WhatsApp number to log outages by message — no app needed. Send{' '}
        <strong style={{ color: '#F0F4FF' }}>off</strong> when light goes,{' '}
        <strong style={{ color: '#F0F4FF' }}>on</strong> when it returns.
      </p>

      {/* Phone input */}
      <div>
        <label className={labelClass}>WhatsApp Phone Number</label>
        <input
          className={inputClass}
          style={inputStyle}
          type="tel"
          inputMode="tel"
          placeholder="e.g. 08012345678 or +2348012345678"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          autoComplete="tel"
        />
        {phone.length > 0 && (
          <p className="mt-1 text-xs" style={{ color: isValid ? '#00A651' : '#fbbf24' }}>
            {isValid
              ? `Will be saved as: +${normalised}`
              : 'Enter a valid Nigerian mobile number (11 digits starting with 0, or include +234).'}
          </p>
        )}
      </div>

      {/* Commands cheat-sheet */}
      <div
        className="rounded-btn px-3 py-3 flex flex-col gap-2"
        style={{ backgroundColor: 'rgba(0,166,81,0.05)', border: '1px solid rgba(0,166,81,0.12)' }}
      >
        <p className="text-xs font-semibold" style={{ color: '#00A651' }}>WhatsApp commands</p>
        {[
          ['off · light off · nepa · no light · light don go', 'Start outage'],
          ['on · light on · back · nepa don come · light don come', 'End outage'],
          ['status', 'Check current outage'],
          ['help', 'Show all commands'],
        ].map(([cmd, desc]) => (
          <div key={cmd} className="flex items-start gap-2 text-xs">
            <code
              className="shrink-0 px-1.5 py-0.5 rounded font-mono leading-relaxed"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#F0F4FF', fontSize: 11 }}
            >
              {cmd}
            </code>
            <span style={dimText}>{desc}</span>
          </div>
        ))}
      </div>

      <SectionSaveButton saving={saving} label="Save WhatsApp Number" />

      {/* Secondary actions: test link + remove */}
      {(testLink || profile?.whatsapp_number) && (
        <div className="flex gap-2">
          {testLink && (
            <a
              href={testLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 rounded-btn text-sm font-semibold text-center transition-opacity"
              style={{
                backgroundColor: 'rgba(37,211,102,0.08)',
                border: '1px solid rgba(37,211,102,0.22)',
                color: '#25D366',
              }}
            >
              Test on WhatsApp
            </a>
          )}
          {profile?.whatsapp_number && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={saving}
              className="flex-1 py-2.5 rounded-btn text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: 'rgba(127,29,29,0.1)',
                border: '1px solid rgba(127,45,45,0.3)',
                color: '#fca5a5',
              }}
            >
              Remove Number
            </button>
          )}
        </div>
      )}
    </form>
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
        <WhatsAppSection profile={profile} saveProfile={saveProfile} showToast={showToast} />
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
