import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient.js';
import { useProfile } from '../App.jsx';
import { NIGERIA_LGAS } from '../lib/nigeriaLGAs.js';

function supplyColor(hours) {
  if (hours >= 18) return '#00A651';
  if (hours >= 14) return '#4caf7d';
  if (hours >= 10) return '#F5A623';
  if (hours >= 6)  return '#E67E22';
  return '#E53935';
}

function formatSupplyHours(h) {
  return `${parseFloat(h).toFixed(1)}h`;
}

function minsToHours(m) {
  return (m / 60).toFixed(1);
}

function Pill({ label, value, color }) {
  return (
    <div
      className="rounded-card p-3 flex flex-col items-center text-center"
      style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)', flex: 1 }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#4A5470' }}>{label}</p>
      <p className="text-sm font-black leading-tight" style={{ color: color || '#F0F4FF', fontFamily: 'Syne, system-ui, sans-serif' }}>{value}</p>
    </div>
  );
}

// ── Period helpers ───────────────────────────────────────────────────────────

function buildDayOptions() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 1 - i);
    const s = d.toLocaleDateString('en-CA');
    return {
      label: i === 0 ? 'Yesterday' : d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }),
      start: s,
      end:   s,
    };
  });
}

function buildWeekOptions() {
  return Array.from({ length: 4 }, (_, i) => {
    const end = new Date();
    end.setDate(end.getDate() - 1 - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const startStr = start.toLocaleDateString('en-CA');
    const endStr   = end.toLocaleDateString('en-CA');
    return {
      label: i === 0
        ? 'Last 7 days'
        : `${start.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`,
      start: startStr,
      end:   endStr,
    };
  });
}

function buildMonthOptions() {
  return Array.from({ length: 3 }, (_, i) => {
    const now   = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const last  = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    return {
      label: first.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' }),
      start: first.toLocaleDateString('en-CA'),
      end:   last.toLocaleDateString('en-CA'),
    };
  });
}

// Aggregate multiple days of RPC results by LGA
async function fetchRange(start, end) {
  // Build list of dates
  const days = [];
  const d = new Date(start + 'T00:00:00');
  const e = new Date(end   + 'T00:00:00');
  while (d <= e) { days.push(d.toLocaleDateString('en-CA')); d.setDate(d.getDate() + 1); }

  const results = await Promise.all(
    days.map(date => supabase.rpc('get_community_stats', { p_date: date }).then(r => r.data || []))
  );

  const byLGA = {};
  for (const dayData of results) {
    for (const s of dayData) {
      if (!byLGA[s.lga]) byLGA[s.lga] = { total: 0, days: 0, reporters: 0, maxMins: 0 };
      byLGA[s.lga].total     += parseFloat(s.avg_supply_hours);
      byLGA[s.lga].days      += 1;
      byLGA[s.lga].reporters  = Math.max(byLGA[s.lga].reporters, s.reporter_count);
      byLGA[s.lga].maxMins    = Math.max(byLGA[s.lga].maxMins, s.max_outage_minutes);
    }
  }

  return Object.entries(byLGA).map(([lga, v]) => ({
    lga,
    avg_supply_hours:   (v.total / v.days).toFixed(2),
    reporter_count:     v.reporters,
    max_outage_minutes: v.maxMins,
  }));
}

const VIEW_MODES = ['Day', 'Week', 'Month'];

const DAY_OPTIONS   = buildDayOptions();
const WEEK_OPTIONS  = buildWeekOptions();
const MONTH_OPTIONS = buildMonthOptions();

export default function Community() {
  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerRef       = useRef(null);
  const { profile }    = useProfile();

  const [stats, setStats]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [mapReady, setMapReady]   = useState(false);
  const [viewMode, setViewMode]   = useState('Day');
  const [periodIdx, setPeriodIdx] = useState(0);

  const options = viewMode === 'Day' ? DAY_OPTIONS : viewMode === 'Week' ? WEEK_OPTIONS : MONTH_OPTIONS;
  const period  = options[periodIdx] || options[0];

  // Reset to first option when switching modes
  const handleModeChange = useCallback((mode) => {
    setViewMode(mode);
    setPeriodIdx(0);
  }, []);

  // ── Data fetch ────────────────────────────────────────────────────────────
  const doFetch = useCallback(async (start, end) => {
    setLoading(true);
    try {
      const data = await fetchRange(start, end);
      setStats(data);
    } catch {
      setStats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    doFetch(period.start, period.end);
  }, [period.start, period.end, doFetch]);

  // ── Map init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    function initMap() {
      if (!window.L) return;
      const L   = window.L;
      const map = L.map(mapRef.current, {
        center: [9.0, 8.0],
        zoom: 6,
        zoomControl: true,
        attributionControl: false,
        preferCanvas: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        maxZoom: 18,
        subdomains: 'abcd',
      }).addTo(map);

      L.control.attribution({ prefix: false, position: 'bottomright' })
        .addAttribution('© <a href="https://carto.com" style="color:#4A5470">CARTO</a>')
        .addTo(map);

      const layer = L.layerGroup().addTo(map);
      layerRef.current       = layer;
      mapInstanceRef.current = map;

      // Multiple invalidateSize calls to handle layout settling
      [100, 300, 600, 1200].forEach(ms => setTimeout(() => map.invalidateSize(), ms));
      setMapReady(true);
    }

    if (window.L) {
      initMap();
    } else {
      // Leaflet not ready yet — poll until available
      const poll = setInterval(() => { if (window.L) { clearInterval(poll); initMap(); } }, 100);
      return () => clearInterval(poll);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerRef.current       = null;
      }
      setMapReady(false);
    };
  }, []);

  // ── Map layer update ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !layerRef.current || !window.L) return;
    const L     = window.L;
    const layer = layerRef.current;
    layer.clearLayers();

    // Aliases for LGA names that changed — maps old DB value → current LGA name
    const LGA_ALIASES = { 'AMAC (Garki/Wuse)': 'AMAC' };
    const normalisedStats = stats.map(s => ({
      ...s,
      lga: LGA_ALIASES[s.lga] || s.lga,
    }));
    const statsMap = Object.fromEntries(normalisedStats.map(s => [s.lga, s]));

    NIGERIA_LGAS.forEach(lga => {
      const s = statsMap[lga.name];

      if (s) {
        const supplyHours = parseFloat(s.avg_supply_hours);
        const color       = supplyColor(supplyHours);
        const radius      = 7 + Math.min(Math.log(s.reporter_count + 1) * 3, 10);
        const periodLabel = viewMode === 'Day' ? 'Avg supply' : 'Avg supply / day';

        const marker = L.circleMarker([lga.lat, lga.lng], {
          radius,
          fillColor:   color,
          fillOpacity: 0.88,
          color:       'rgba(255,255,255,0.22)',
          weight:      1.5,
        });

        marker.bindPopup(
          `<div class="pw-popup">
            <p class="pw-popup-title">${lga.name}</p>
            <p class="pw-popup-sub">${lga.state} · ${lga.disco}</p>
            <div class="pw-popup-rows">
              <span style="color:#8B95B0">${periodLabel}</span>
              <span style="color:${color};font-weight:700">${formatSupplyHours(supplyHours)}</span>
              <span style="color:#8B95B0">Reporters</span>
              <span style="color:#F0F4FF;font-weight:600">${s.reporter_count}</span>
              <span style="color:#8B95B0">Worst outage</span>
              <span style="color:#E53935;font-weight:600">${minsToHours(s.max_outage_minutes)}h</span>
            </div>
          </div>`,
          { className: 'pw-leaflet-popup' }
        );

        layer.addLayer(marker);
      } else {
        const marker = L.circleMarker([lga.lat, lga.lng], {
          radius:      4,
          fillColor:   '#111827',
          fillOpacity: 0.7,
          color:       'rgba(255,255,255,0.08)',
          weight:      1,
        });
        marker.bindPopup(
          `<div class="pw-popup">
            <p class="pw-popup-title">${lga.name}</p>
            <p class="pw-popup-sub" style="color:#4A5470">${lga.state} · No data for this period</p>
          </div>`,
          { className: 'pw-leaflet-popup' }
        );
        layer.addLayer(marker);
      }
    });
  }, [stats, mapReady, viewMode]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const LGA_ALIASES = { 'AMAC (Garki/Wuse)': 'AMAC' };
  const normStats = stats.map(s => ({ ...s, lga: LGA_ALIASES[s.lga] || s.lga }));
  const totalReporters = normStats.reduce((s, d) => s + d.reporter_count, 0);
  const sorted         = [...normStats].sort((a, b) => parseFloat(a.avg_supply_hours) - parseFloat(b.avg_supply_hours));
  const worstLGA       = sorted[0]                 ?? null;
  const bestLGA        = sorted[sorted.length - 1] ?? null;
  const hasData        = stats.length > 0;

  return (
    <div className="flex flex-col gap-0 pb-24">
      {/* ── Header ── */}
      <div className="px-4 pt-6 pb-3">
        <p
          className="text-xs font-black uppercase tracking-widest mb-1"
          style={{ color: '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}
        >
          Community
        </p>
        <h1
          className="text-xl font-black text-textPrimary leading-none"
          style={{ fontFamily: 'Syne, system-ui, sans-serif' }}
        >
          Outage Map
        </h1>
        <p className="text-xs mt-1" style={{ color: '#4A5470' }}>
          Crowd-sourced supply data across Nigeria
        </p>

        {/* Period selector */}
        <div className="flex items-center gap-2 mt-3">
          {/* Day / Week / Month tabs */}
          <div
            className="flex rounded-btn p-0.5 shrink-0"
            style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {VIEW_MODES.map(mode => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className="text-xs font-semibold px-3 py-1 rounded-btn"
                style={{
                  backgroundColor: viewMode === mode ? '#00A651' : 'transparent',
                  color:           viewMode === mode ? '#fff'     : '#4A5470',
                  transition: 'background-color 0.15s',
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Period picker */}
          <select
            value={periodIdx}
            onChange={e => setPeriodIdx(Number(e.target.value))}
            className="text-xs font-semibold px-3 py-1.5 rounded-btn flex-1"
            style={{
              backgroundColor: '#111827',
              border: '1px solid rgba(255,255,255,0.07)',
              color: '#8B95B0',
            }}
          >
            {options.map((o, i) => (
              <option key={i} value={i}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Stats pills ── */}
      <div className="px-4 pb-3 flex gap-2">
        <Pill label="Reporters" value={loading ? '…' : totalReporters} color="#00A651" />
        <Pill
          label="Worst Area"
          value={loading ? '…' : (worstLGA ? worstLGA.lga : '—')}
          color={worstLGA ? '#E53935' : '#4A5470'}
        />
        <Pill
          label="Best Area"
          value={loading ? '…' : (bestLGA ? bestLGA.lga : '—')}
          color={bestLGA ? '#00A651' : '#4A5470'}
        />
      </div>

      {/* ── Map ── */}
      <div className="px-4">
        <div style={{ position: 'relative' }}>
          <div
            ref={mapRef}
            style={{
              height: 340,
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
            }}
          />

          {loading && (
            <div
              style={{
                position: 'absolute', inset: 0, zIndex: 900, borderRadius: 14,
                backgroundColor: 'rgba(10,17,33,0.65)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <p className="text-sm font-semibold" style={{ color: '#8B95B0' }}>
                Loading community data…
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="px-4 pt-2 pb-1 flex justify-end gap-3 flex-wrap">
        {[
          { color: '#00A651',              label: '18+ h' },
          { color: '#F5A623',              label: '10–18 h' },
          { color: '#E53935',              label: '< 10 h' },
          { color: 'rgba(255,255,255,0.1)', label: 'No data' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
            <span className="text-xs" style={{ color: '#4A5470' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── LGA list ── */}
      <div className="px-4 pt-2">
        {!loading && !hasData ? (
          <div className="py-10 text-center">
            <p className="text-3xl mb-3">📡</p>
            <p className="font-black text-textPrimary mb-1">No reports for this period</p>
            <p className="text-xs leading-relaxed" style={{ color: '#4A5470' }}>
              Enable community reporting in{' '}
              <span className="font-semibold" style={{ color: '#F0F4FF' }}>Settings → Community</span>{' '}
              to contribute your anonymised outage data.
            </p>
          </div>
        ) : hasData ? (
          <>
            <p
              className="text-xs font-black uppercase tracking-widest mb-3"
              style={{ color: '#4A5470', fontFamily: 'Syne, system-ui, sans-serif' }}
            >
              Most Affected LGAs
            </p>
            <div
              className="rounded-card overflow-hidden"
              style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {sorted.slice(0, 10).map((s, i) => {
                const supplyHours = parseFloat(s.avg_supply_hours);
                const color       = supplyColor(supplyHours);
                return (
                  <div
                    key={s.lga}
                    className="flex items-center px-4 py-3 gap-3"
                    style={{
                      borderBottom: i < Math.min(sorted.length, 10) - 1
                        ? '1px solid rgba(255,255,255,0.04)'
                        : 'none',
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-textPrimary truncate">{s.lga}</p>
                      <p className="text-xs" style={{ color: '#4A5470' }}>
                        {s.reporter_count} reporter{s.reporter_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black tabular-nums" style={{ color, fontFamily: 'Syne, system-ui, sans-serif' }}>
                        {formatSupplyHours(supplyHours)}
                      </p>
                      <p className="text-xs" style={{ color: '#4A5470' }}>
                        {viewMode === 'Day' ? 'avg supply' : 'avg / day'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      {/* ── Community CTA ── */}
      {(!profile?.community_opt_in || !profile?.lga) && (
        <div className="px-4 pt-4">
          <div
            className="rounded-card p-4"
            style={{
              backgroundColor: '#111827',
              borderLeft: '3px solid #00A651',
              boxShadow: '0 0 0 1px rgba(0,166,81,0.12)',
            }}
          >
            <p className="text-sm font-black text-textPrimary mb-1">Help build the map</p>
            <p className="text-xs leading-relaxed" style={{ color: '#8B95B0' }}>
              Share your anonymous outage data — only your LGA and daily outage hours are
              submitted, never personal details. Enable it in{' '}
              <span className="font-semibold" style={{ color: '#F0F4FF' }}>
                Settings → Community Reporting
              </span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
