import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Download, FileText } from 'lucide-react';
import { useProfile, useOutages, useAuth } from '../App.jsx';
import { buildComplaintLetter, buildCSV, buildRechargeCSV, downloadFile } from '../lib/reportBuilder.js';
import { todayStr } from '../lib/calculations.js';
import { supabase } from '../supabaseClient.js';

export default function ReportGenerator() {
  const { profile } = useProfile();
  const { outages, outagesLoading } = useOutages();
  const { session } = useAuth();

  const [recharges, setRecharges] = useState([]);

  const fetchRecharges = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('recharges')
      .select('*')
      .eq('user_id', session.user.id)
      .order('recharge_date', { ascending: false });
    if (data) setRecharges(data);
  }, [session]);

  useEffect(() => { fetchRecharges(); }, [fetchRecharges]);

  const letter = useMemo(() => {
    if (!profile) return null;
    return buildComplaintLetter({ profile, outages, recharges });
  }, [profile, outages, recharges]);

  const handleDownloadLetter = () => {
    if (!letter) return;
    const filename = `powerwatch-complaint-${todayStr()}.txt`;
    downloadFile(letter, filename, 'text/plain');
  };

  const handleDownloadCSV = () => {
    if (outages.length === 0) return;
    const csv = buildCSV(outages);
    const filename = `powerwatch-outages-${todayStr()}.csv`;
    downloadFile(csv, filename, 'text/csv');
  };

  const handleDownloadRechargeCSV = () => {
    if (recharges.length === 0) return;
    const csv = buildRechargeCSV(recharges);
    const filename = `powerwatch-recharges-${todayStr()}.csv`;
    downloadFile(csv, filename, 'text/csv');
  };

  return (
    <div className="px-4 py-6 flex flex-col gap-6">
      <h2
        className="text-xl font-black text-textPrimary"
        style={{ fontFamily: 'Syne, system-ui, sans-serif' }}
      >
        Report Generator
      </h2>

      {!profile && (
        <div className="rounded-card px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(245,166,35,0.1)', border: '1px solid #F5A623', color: '#fbbf24' }}>
          <strong>Profile required.</strong> Go to Settings to add your name, address, DisCo, and service band before generating a complaint letter.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          onClick={handleDownloadLetter}
          disabled={!profile || outagesLoading}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-btn font-semibold text-sm transition-opacity disabled:opacity-40 btn-glow"
          style={{ background: 'linear-gradient(180deg, #00A651 0%, #008f47 100%)', color: '#001a0f' }}
        >
          <Download size={17} />
          Generate Complaint Letter
        </button>
        <button
          onClick={handleDownloadCSV}
          disabled={outages.length === 0 || outagesLoading}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-btn font-semibold text-sm transition-opacity disabled:opacity-40"
          style={{ backgroundColor: '#111827', color: '#F0F4FF', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <FileText size={17} />
          Export Outage Log (CSV)
        </button>
        <button
          onClick={handleDownloadRechargeCSV}
          disabled={recharges.length === 0}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-btn font-semibold text-sm transition-opacity disabled:opacity-40 sm:col-span-2"
          style={{ backgroundColor: '#111827', color: '#F0F4FF', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <FileText size={17} />
          Export Recharge Log (CSV)
        </button>
      </div>

      {profile ? (
        <section>
          <h3
            className="text-xs font-black uppercase tracking-widest mb-3"
            style={{ color: '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}
          >
            Letter Preview
          </h3>
          {outagesLoading ? (
            <div className="rounded-card p-4 animate-pulse" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)', minHeight: 200 }}>
              <div className="h-3 w-3/4 rounded mb-3 skeleton" />
              <div className="h-3 w-1/2 rounded mb-3 skeleton" />
              <div className="h-3 w-2/3 rounded skeleton" />
            </div>
          ) : (
            <div
              className="rounded-card p-4 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap"
              style={{
                backgroundColor: '#0B0F1A',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#8B95B0',
                maxHeight: '60vh',
                overflowY: 'auto',
              }}
            >
              {letter || 'Add outage records to generate a letter.'}
            </div>
          )}
          {letter && (
            <p className="text-xs text-textMuted mt-2 text-center">
              This letter is generated automatically from your logged outages. Review before sending.
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-card p-8 text-center text-textMuted text-sm" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
          Complete your profile to see a letter preview here.
        </section>
      )}

      <section className="rounded-card p-4" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h3
          className="text-xs font-black uppercase tracking-widest mb-3"
          style={{ color: '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}
        >
          How to Use
        </h3>
        <ol className="text-sm text-textMuted flex flex-col gap-2 list-decimal list-inside">
          <li>Log all your power outages in the <strong className="text-textPrimary">Log</strong> tab for at least a week.</li>
          <li>Check the <strong className="text-textPrimary">Dashboard</strong> to confirm threshold breaches.</li>
          <li>Tap <strong className="text-textPrimary">Generate Complaint Letter</strong> to download a .txt file.</li>
          <li>Email the letter to your DisCo's customer care address (see Settings).</li>
          <li>CC: NERC Abuja Forum Office — the letter includes this automatically.</li>
          <li>If no response within 14 days, escalate to NERC HQ at complaints@nerc.gov.ng.</li>
        </ol>
      </section>
    </div>
  );
}
