import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient.js';
import { useProfile } from '../App.jsx';
import { NIGERIA_LGAS } from '../lib/nigeriaLGAs.js';

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-CA');
}

function supplyColor(hours) {
  if (hours >= 18) return '#2ECC71';
  if (hours >= 14) return '#27AE60';
  if (hours >= 10) return '#F39C12';
  if (hours >= 6)  return '#E67E22';
  return '#E74C3C';
}

function formatSupplyHours(h) {
  return `${parseFloat(h).toFixed(1)}h`;
}

function minsToHours(m) {
  return (m / 60).toFixed(1);
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function Pill({ label, value, color }) {
  return (
    <div
      className="rounded-card p-3 flex flex-col items-center text-center"
      style={{ backgroundColor: '#1E293B', boxShadow: '0 0 0 1px rgba(255,255,255,0.05)', flex: 1 }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#475569' }}>{label}</p>
      <p className="text-sm font-black leading-tight" style={{ color: color || '#F8FAFC' }}>{value}</p>
    </div>
  );
}

export default function Community() {
  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerRef       = useRef(null);
  const { profile }    = useProfile();

  const [stats, setStats]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [mapReady, setMapReady]         = useState(false);
  const [selectedDate, setSelectedDate] = useState(yesterdayStr);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async (date) => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_community_stats', { p_date: date });
    if (!error && Array.isArray(data)) setStats(data);
    else setStats([]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(selectedDate); }, [selectedDate, fetchStats]);

  // ── Init Leaflet once ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !window.L || mapInstanceRef.current) return;
    const L = window.L;

    const map = L.map(mapRef.current, {
      center: [9.0, 8.0],
      zoom: 6,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(map);

    // Minimal attribution tucked in corner
    L.control.attribution({ prefix: false, position: 'bottomright' })
      .addAttribution('© <a href="https://carto.com" style="color:#475569">CARTO</a>')
      .addTo(map);

    const layer = L.layerGroup().addTo(map);
    layerRef.current       = layer;
    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerRef.current       = null;
      setMapReady(false);
    };
  }, []);

  // ── Redraw markers whenever data or mapReady changes ──────────────────────
  useEffect(() => {
    if (!mapReady || !layerRef.current || !window.L) return;
    const L     = window.L;
    const layer = layerRef.current;
    layer.clearLayers();

    const statsMap = Object.fromEntries(stats.map(s => [s.lga, s]));

    NIGERIA_LGAS.forEach(lga => {
      const s = statsMap[lga.name];

      if (s) {
        const supplyHours = parseFloat(s.avg_supply_hours);
        const color       = supplyColor(supplyHours);
        const radius      = 7 + Math.min(Math.log(s.reporter_count + 1) * 3, 10);

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
              <span style="color:#94A3B8">Avg supply</span>
              <span style="color:${color};font-weight:700">${formatSupplyHours(supplyHours)}</span>
              <span style="color:#94A3B8">Reporters</span>
              <span style="color:#F8FAFC;font-weight:600">${s.reporter_count}</span>
              <span style="color:#94A3B8">Worst outage</span>
              <span style="color:#E74C3C;font-weight:600">${minsToHours(s.max_outage_minutes)}h</span>
            </div>
          </div>`,
          { className: 'pw-leaflet-popup' }
        );

        layer.addLayer(marker);
      } else {
        // Dim placeholder for LGAs with no data
        const marker = L.circleMarker([lga.lat, lga.lng], {
          radius:      4,
          fillColor:   '#1E293B',
          fillOpacity: 0.7,
          color:       '#334155',
          weight:      1,
        });
        marker.bindPopup(
          `<div class="pw-popup">
            <p class="pw-popup-title">${lga.name}</p>
            <p class="pw-popup-sub" style="color:#334155">${lga.state} · No data for this date</p>
          </div>`,
          { className: 'pw-leaflet-popup' }
        );
        layer.addLayer(marker);
      }
    });
  }, [stats, mapReady]);

  // ── Date options — yesterday + 6 prior days ────────────────────────────────
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 1 - i);
    const value = d.toLocaleDateString('en-CA');
    const label = i === 0
      ? 'Yesterday'
      : d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });
    return { value, label };
  });

  // ── Derived ────────────────────────────────────────────────────────────────
  const totalReporters = stats.reduce((s, d) => s + d.reporter_count, 0);
  const sorted         = [...stats].sort((a, b) => parseFloat(a.avg_supply_hours) - parseFloat(b.avg_supply_hours));
  const worstLGA       = sorted[0]    ?? null;
  const bestLGA        = sorted[sorted.length - 1] ?? null;
  const hasData        = stats.length > 0;

  return (
    <div className="flex flex-col gap-0 pb-24">
      {/* ── Header ── */}
      <div className="px-4 pt-6 pb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#475569' }}>
            Community
          </p>
          <h1 className="text-xl font-black text-textPrimary leading-none">Outage Map</h1>
          <p className="text-xs mt-1" style={{ color: '#475569' }}>
            Crowd-sourced supply data across Nigeria
          </p>
        </div>
        <select
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="text-xs font-semibold px-3 py-1.5 rounded-btn shrink-0"
          style={{ backgroundColor: '#1E293B', border: '1px solid #334155', color: '#94A3B8' }}
        >
          {dateOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* ── Pills ── */}
      <div className="px-4 pb-3 flex gap-2">
        <Pill label="Reporters" value={loading ? '…' : totalReporters} color="#2ECC71" />
        <Pill
          label="Worst Area"
          value={loading ? '…' : (worstLGA ? worstLGA.lga : '—')}
          color={worstLGA ? '#E74C3C' : '#475569'}
        />
        <Pill
          label="Best Area"
          value={loading ? '…' : (bestLGA ? bestLGA.lga : '—')}
          color={bestLGA ? '#2ECC71' : '#475569'}
        />
      </div>

      {/* ── Map ── */}
      <div className="px-4">
        <div
          style={{
            height: 340,
            borderRadius: 14,
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
          }}
        >
          <div ref={mapRef} style={{ height: '100%', width: '100%' }} />

          {/* Loading veil */}
          {loading && (
            <div
              style={{
                position: 'absolute', inset: 0, zIndex: 900,
                backgroundColor: 'rgba(10,17,33,0.65)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <p className="text-sm font-semibold" style={{ color: '#94A3B8' }}>
                Loading community data…
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="px-4 pt-2 pb-1 flex justify-end gap-3 flex-wrap">
        {[
          { color: '#2ECC71', label: '18+ h' },
          { color: '#F39C12', label: '10–18 h' },
          { color: '#E74C3C', label: '< 10 h' },
          { color: '#334155', label: 'No data' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
            <span className="text-xs" style={{ color: '#475569' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Most affected LGAs ── */}
      <div className="px-4 pt-2">
        {!loading && !hasData ? (
          <div className="py-10 text-center">
            <p className="text-3xl mb-3">📡</p>
            <p className="font-black text-textPrimary mb-1">No reports for this date</p>
            <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>
              Enable community reporting in{' '}
              <span className="font-semibold" style={{ color: '#F8FAFC' }}>Settings → Community</span>{' '}
              to contribute your anonymised outage data.
            </p>
          </div>
        ) : hasData ? (
          <>
            <p
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: '#475569' }}
            >
              Most Affected LGAs
            </p>
            <div
              className="rounded-card overflow-hidden"
              style={{ backgroundColor: '#1E293B', boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }}
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
                    <div
                      style={{
                        width: 8, height: 8, borderRadius: '50%',
                        backgroundColor: color, flexShrink: 0,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-textPrimary truncate">{s.lga}</p>
                      <p className="text-xs" style={{ color: '#475569' }}>
                        {s.reporter_count} reporter{s.reporter_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black tabular-nums" style={{ color }}>
                        {formatSupplyHours(supplyHours)}
                      </p>
                      <p className="text-xs" style={{ color: '#475569' }}>avg supply</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      {/* ── Contribute prompt ── */}
      {(!profile?.community_opt_in || !profile?.lga) && (
        <div className="px-4 pt-4">
          <div
            className="rounded-card p-4"
            style={{
              backgroundColor: '#1E293B',
              borderLeft: '3px solid #2ECC71',
              boxShadow: '0 0 0 1px rgba(46,204,113,0.12)',
            }}
          >
            <p className="text-sm font-black text-textPrimary mb-1">Help build the map</p>
            <p className="text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
              Share your anonymous outage data — only your LGA and daily outage hours are
              submitted, never personal details. Enable it in{' '}
              <span className="font-semibold" style={{ color: '#F8FAFC' }}>
                Settings → Community Reporting
              </span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
