import React, { useState } from 'react';
import { useProfile } from '../App.jsx';
import { LGA_BY_STATE, LGA_STATES } from '../lib/nigeriaLGAs.js';

const DISCOS = ['AEDC', 'EKEDC', 'IE', 'PHED', 'EEDC', 'IBEDC', 'BeDE', 'KEDCO', 'KAEDCO', 'Other'];
const BANDS  = [
  { id: 'A', label: 'Band A', desc: '20 hrs/day' },
  { id: 'B', label: 'Band B', desc: '16 hrs/day' },
  { id: 'C', label: 'Band C', desc: '12 hrs/day' },
  { id: 'D', label: 'Band D', desc: '8 hrs/day'  },
  { id: 'E', label: 'Band E', desc: '4 hrs/day'  },
];

const inputClass = 'w-full px-3 py-2.5 rounded-btn text-sm text-textPrimary placeholder-textMuted/50 outline-none focus:ring-2 focus:ring-accent';
const inputStyle = { backgroundColor: '#0F172A', border: '1px solid #334155' };
const labelClass = 'block text-xs font-semibold text-textMuted uppercase tracking-wide mb-1.5';

function Step1({ onNext }) {
  return (
    <div className="flex flex-col gap-6 text-center">
      <div className="flex justify-center">
        <img
          src="/icon-192.png"
          alt="PowerWatch"
          className="w-20 h-20 rounded-2xl"
          style={{ filter: 'drop-shadow(0 0 12px rgba(0,166,81,0.4))' }}
        />
      </div>
      <div>
        <h1 className="text-2xl font-black text-textPrimary mb-2">Welcome to PowerWatch</h1>
        <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>
          Track your electricity supply, know your NERC rights, and generate formal
          complaint letters when your DisCo falls short.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 text-left">
        {[
          { icon: '📋', title: 'Log outages instantly', desc: 'One tap to start timing — we calculate the duration automatically.' },
          { icon: '📊', title: 'See your data', desc: 'Charts show how your supply compares to your Band minimum.' },
          { icon: '✉️', title: 'File complaints', desc: 'Generate a formal NERC complaint letter in seconds.' },
        ].map(({ icon, title, desc }) => (
          <div
            key={title}
            className="rounded-card px-4 py-3 flex items-start gap-3"
            style={{ backgroundColor: '#0F172A', border: '1px solid #1E3A2F' }}
          >
            <span className="text-xl mt-0.5">{icon}</span>
            <div>
              <p className="text-sm font-semibold text-textPrimary">{title}</p>
              <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onNext}
        className="w-full py-3.5 rounded-btn font-black text-sm"
        style={{ backgroundColor: '#2ECC71', color: '#0F172A' }}
      >
        Get Started
      </button>
    </div>
  );
}

function Step2({ form, onChange, onNext, onBack }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-black text-textPrimary mb-1">Your electricity account</h2>
        <p className="text-xs" style={{ color: '#94A3B8' }}>
          Used to personalise your Band threshold and complaint letters.
        </p>
      </div>

      <div>
        <label className={labelClass}>Distribution Company (DisCo)</label>
        <select
          className={inputClass}
          style={inputStyle}
          value={form.disco}
          onChange={e => onChange('disco', e.target.value)}
        >
          <option value="">— Select your DisCo —</option>
          {DISCOS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div>
        <label className={labelClass}>Service Band</label>
        <div className="grid grid-cols-5 gap-2">
          {BANDS.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => onChange('service_band', b.id)}
              className="rounded-btn py-2.5 flex flex-col items-center gap-0.5 transition-colors"
              style={{
                backgroundColor: form.service_band === b.id ? 'rgba(46,204,113,0.15)' : '#0F172A',
                border: `1px solid ${form.service_band === b.id ? '#2ECC71' : '#334155'}`,
                color: form.service_band === b.id ? '#2ECC71' : '#94A3B8',
              }}
            >
              <span className="text-sm font-black">{b.id}</span>
              <span className="text-xs" style={{ fontSize: 9 }}>{b.desc}</span>
            </button>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: '#475569' }}>
          Not sure? Check your electricity bill or meter for your service band.
        </p>
      </div>

      <div>
        <label className={labelClass}>Full Name <span style={{ color: '#475569', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(for complaint letters)</span></label>
        <input
          className={inputClass}
          style={inputStyle}
          type="text"
          placeholder="e.g. Amara Okafor"
          value={form.full_name}
          onChange={e => onChange('full_name', e.target.value)}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-btn font-semibold text-sm"
          style={{ backgroundColor: '#1E293B', color: '#94A3B8', border: '1px solid #334155' }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!form.disco || !form.service_band}
          className="flex-[2] py-3 rounded-btn font-black text-sm disabled:opacity-40"
          style={{ backgroundColor: '#2ECC71', color: '#0F172A' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function Step3({ form, onChange, onFinish, onBack, saving }) {
  const [lgaSearch, setLgaSearch] = useState('');
  const [lgaOpen, setLgaOpen] = useState(false);

  const filtered = lgaSearch.trim().length > 0
    ? LGA_STATES.flatMap(state =>
        LGA_BY_STATE[state]
          .filter(l => l.name.toLowerCase().includes(lgaSearch.toLowerCase()))
          .map(l => ({ ...l, state }))
      ).slice(0, 12)
    : [];

  function selectLga(name) {
    onChange('lga', name);
    setLgaSearch(name);
    setLgaOpen(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-black text-textPrimary mb-1">Your location</h2>
        <p className="text-xs" style={{ color: '#94A3B8' }}>
          Optional — lets you contribute to the community outage map.
        </p>
      </div>

      <div className="relative">
        <label className={labelClass}>Local Government Area (LGA)</label>
        <input
          className={inputClass}
          style={inputStyle}
          type="text"
          placeholder="Type to search…"
          value={lgaSearch}
          onFocus={() => setLgaOpen(true)}
          onChange={e => { setLgaSearch(e.target.value); onChange('lga', ''); setLgaOpen(true); }}
        />
        {lgaOpen && filtered.length > 0 && (
          <div
            className="absolute left-0 right-0 z-50 mt-1 rounded-btn overflow-y-auto"
            style={{ backgroundColor: '#1E293B', border: '1px solid #334155', maxHeight: 200 }}
          >
            {filtered.map(l => (
              <button
                key={l.id}
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/5 transition-colors"
                style={{ color: '#F8FAFC' }}
                onMouseDown={() => selectLga(l.name)}
              >
                {l.name}
                <span className="text-xs ml-2" style={{ color: '#475569' }}>{l.state}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Community opt-in */}
      <div
        className="rounded-card p-4"
        style={{ backgroundColor: '#0F172A', border: '1px solid #1E3A2F' }}
      >
        <button
          type="button"
          role="switch"
          aria-checked={form.community_opt_in}
          onClick={() => onChange('community_opt_in', !form.community_opt_in)}
          className="flex items-center gap-3 w-full text-left"
        >
          <div
            className="relative shrink-0 rounded-full transition-colors duration-200"
            style={{ width: 44, height: 24, backgroundColor: form.community_opt_in ? '#2ECC71' : '#334155' }}
          >
            <div
              className="absolute top-0.5 rounded-full transition-transform duration-200"
              style={{
                width: 20, height: 20, backgroundColor: '#F8FAFC',
                transform: form.community_opt_in ? 'translateX(22px)' : 'translateX(2px)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-textPrimary">Share anonymously</p>
            <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
              Contribute outage data to the community map. Only your LGA and daily
              outage minutes are shared — never your name or address.
            </p>
          </div>
        </button>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-btn font-semibold text-sm"
          style={{ backgroundColor: '#1E293B', color: '#94A3B8', border: '1px solid #334155' }}
        >
          Back
        </button>
        <button
          onClick={onFinish}
          disabled={saving}
          className="flex-[2] py-3 rounded-btn font-black text-sm disabled:opacity-50"
          style={{ backgroundColor: '#2ECC71', color: '#0F172A' }}
        >
          {saving ? 'Saving…' : 'Start Tracking'}
        </button>
      </div>
    </div>
  );
}

export default function Onboarding({ onComplete }) {
  const { saveProfile } = useProfile();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    disco: '',
    service_band: 'A',
    lga: '',
    community_opt_in: false,
  });

  function change(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function finish() {
    setSaving(true);
    const payload = {
      full_name: form.full_name,
      disco: form.disco,
      service_band: form.service_band,
      lga: form.lga || null,
      community_opt_in: form.community_opt_in,
    };
    await saveProfile(payload);
    localStorage.setItem('pw_onboarded', '1');
    setSaving(false);
    onComplete();
  }

  const steps = [
    <Step1 onNext={() => setStep(1)} />,
    <Step2 form={form} onChange={change} onNext={() => setStep(2)} onBack={() => setStep(0)} />,
    <Step3 form={form} onChange={change} onFinish={finish} onBack={() => setStep(1)} saving={saving} />,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-y-auto page-enter"
        style={{ backgroundColor: '#1E293B', maxHeight: '90vh', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-5 pb-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                backgroundColor: i === step ? '#2ECC71' : i < step ? '#2ECC7166' : '#334155',
              }}
            />
          ))}
        </div>

        <div className="px-6 pt-4 pb-8">
          {steps[step]}
        </div>
      </div>
    </div>
  );
}
