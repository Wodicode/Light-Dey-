import React, { useMemo } from 'react';
import { Download, FileText } from 'lucide-react';
import { useProfile, useOutages } from '../App.jsx';
import { buildComplaintLetter, buildCSV, downloadFile } from '../lib/reportBuilder.js';
import { todayStr } from '../lib/calculations.js';

export default function ReportGenerator() {
  const { profile } = useProfile();
  const { outages, outagesLoading } = useOutages();

  const letter = useMemo(() => {
    if (!profile) return null;
    return buildComplaintLetter({ profile, outages });
  }, [profile, outages]);

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

  return (
    <div className="px-4 py-6 flex flex-col gap-6">
      <h2 className="text-xl font-bold text-textPrimary">Report Generator</h2>

      {!profile && (
        <div className="rounded-card px-4 py-3 text-sm" style={{ backgroundColor: '#F39C1218', border: '1px solid #F39C12', color: '#fbbf24' }}>
          <strong>Profile required.</strong> Go to Settings to add your name, address, DisCo, and service band before generating a complaint letter.
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          onClick={handleDownloadLetter}
          disabled={!profile || outagesLoading}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-btn font-semibold text-sm transition-opacity disabled:opacity-40"
          style={{ backgroundColor: '#2ECC71', color: '#0F172A' }}
        >
          <Download size={17} />
          Generate Complaint Letter
        </button>
        <button
          onClick={handleDownloadCSV}
          disabled={outages.length === 0 || outagesLoading}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-btn font-semibold text-sm transition-opacity disabled:opacity-40"
          style={{ backgroundColor: '#1E293B', color: '#F8FAFC', border: '1px solid #334155' }}
        >
          <FileText size={17} />
          Export Outage Log (CSV)
        </button>
      </div>

      {/* Letter preview */}
      {profile ? (
        <section>
          <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wide mb-3">Letter Preview</h3>
          {outagesLoading ? (
            <div className="rounded-card p-4 animate-pulse" style={{ backgroundColor: '#1E293B', border: '1px solid #334155', minHeight: 200 }}>
              <div className="h-3 w-3/4 rounded mb-3" style={{ backgroundColor: '#334155' }} />
              <div className="h-3 w-1/2 rounded mb-3" style={{ backgroundColor: '#334155' }} />
              <div className="h-3 w-2/3 rounded" style={{ backgroundColor: '#334155' }} />
            </div>
          ) : (
            <div
              className="rounded-card p-4 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap"
              style={{
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                color: '#94A3B8',
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
        <section className="rounded-card p-8 text-center text-textMuted text-sm" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
          Complete your profile to see a letter preview here.
        </section>
      )}

      {/* How to use */}
      <section className="rounded-card p-4" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
        <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wide mb-3">How to Use</h3>
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
