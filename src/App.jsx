import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient.js';
import { buildOutageMap, getComplaintReadiness } from './lib/calculations.js';
import AuthScreen from './components/AuthScreen.jsx';
import NavBar from './components/NavBar.jsx';
import ActiveOutageBanner from './components/ActiveOutageBanner.jsx';
import Dashboard from './components/Dashboard.jsx';
import OutageLog from './components/OutageLog.jsx';
import Analytics from './components/Analytics.jsx';
import ReportGenerator from './components/ReportGenerator.jsx';
import Settings from './components/Settings.jsx';
import Community from './components/Community.jsx';
import Admin from './components/Admin.jsx';
import Onboarding from './components/Onboarding.jsx';
import SpendTracker from './components/SpendTracker.jsx';
import Badges from './components/Badges.jsx';

// ── Contexts ────────────────────────────────────────────────────────────────

export const AuthContext = createContext(null);
export const ProfileContext = createContext(null);
export const OutagesContext = createContext(null);

export function useAuth() { return useContext(AuthContext); }
export function useProfile() { return useContext(ProfileContext); }
export function useOutages() { return useContext(OutagesContext); }

// ── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="toast-enter px-4 py-3 rounded-btn text-sm font-semibold pointer-events-auto"
          style={{
            backgroundColor: t.type === 'error' ? '#E53935' : '#0d1f14',
            color: '#F0F4FF',
            border: `1px solid ${t.type === 'error' ? 'rgba(255,255,255,0.12)' : 'rgba(0,166,81,0.35)'}`,
            boxShadow: t.type === 'error'
              ? '0 4px 20px rgba(229,57,53,0.3), 0 1px 0 rgba(255,255,255,0.08) inset'
              : '0 4px 20px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.06) inset',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [outages, setOutages] = useState([]);
  const [outagesLoading, setOutagesLoading] = useState(false);
  const [activeOutage, setActiveOutage] = useState(null);
  const [confirmations, setConfirmations] = useState([]);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [toasts, setToasts] = useState([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // ── Toast helpers ──────────────────────────────────────────────────────────

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // ── Offline detection ──────────────────────────────────────────────────────

  useEffect(() => {
    const onOnline  = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // ── Auth ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Profile ────────────────────────────────────────────────────────────────

  const fetchProfile = useCallback(async (userId) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data || null);
      if (!data && !localStorage.getItem('pw_onboarded')) setShowOnboarding(true);
      else if (!data) setCurrentTab('settings');
    } catch (err) {
      showToast('Failed to load profile. ' + err.message, 'error');
    } finally {
      setProfileLoading(false);
    }
  }, [showToast]);

  // ── Outages ────────────────────────────────────────────────────────────────

  const fetchOutages = useCallback(async (userId) => {
    setOutagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('outages')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });
      if (error) throw error;
      setOutages(data || []);
      const active = (data || []).find(o => o.is_active);
      setActiveOutage(active || null);
    } catch (err) {
      showToast('Failed to load outages. ' + err.message, 'error');
    } finally {
      setOutagesLoading(false);
    }
  }, [showToast]);

  const fetchConfirmations = useCallback(async (userId) => {
    try {
      const { data } = await supabase
        .from('daily_confirmations')
        .select('date')
        .eq('user_id', userId);
      setConfirmations(data || []);
    } catch (_) {}
  }, []);

  const addConfirmation = useCallback(async (dateStr) => {
    if (!session?.user) return;
    try {
      await supabase
        .from('daily_confirmations')
        .upsert({ user_id: session.user.id, date: dateStr }, { onConflict: 'user_id,date' });
      setConfirmations(prev =>
        prev.some(c => c.date === dateStr) ? prev : [...prev, { date: dateStr }]
      );
      showToast('Logged — streak maintained!');
    } catch (err) {
      showToast('Failed to log: ' + err.message, 'error');
    }
  }, [session, showToast]);

  useEffect(() => {
    if (session?.user) {
      fetchProfile(session.user.id);
      fetchOutages(session.user.id);
      fetchConfirmations(session.user.id);
    } else if (session === null) {
      setProfile(null);
      setOutages([]);
      setActiveOutage(null);
      setConfirmations([]);
    }
  }, [session, fetchProfile, fetchOutages, fetchConfirmations]);

  // ── Outage mutations ───────────────────────────────────────────────────────

  // Must be declared before the outage callbacks that reference it in deps.
  const syncCommunityReport = useCallback(async (date, outageMinutesForDay) => {
    if (!profile?.community_opt_in || !profile?.lga || !session?.user) return;
    await supabase.from('community_reports').upsert({
      user_id:        session.user.id,
      report_date:    date,
      lga:            profile.lga,
      disco:          profile.disco        || null,
      service_band:   profile.service_band || null,
      outage_minutes: outageMinutesForDay,
    }, { onConflict: 'user_id,report_date' });
  }, [profile, session]);

  const startOutage = useCallback(async () => {
    if (!session?.user) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const timeStr = now.toTimeString().slice(0, 8);  // HH:MM:SS
    try {
      const { data, error } = await supabase
        .from('outages')
        .insert({
          user_id: session.user.id,
          date: dateStr,
          start_time: timeStr,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      setActiveOutage(data);
      setOutages(prev => [data, ...prev]);
      showToast('Outage started. Stay safe!');
    } catch (err) {
      showToast('Failed to start outage: ' + err.message, 'error');
    }
  }, [session, showToast]);

  const endOutage = useCallback(async () => {
    if (!activeOutage) return;
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);
    const startMinutes = parseInt(activeOutage.start_time.split(':')[0]) * 60
      + parseInt(activeOutage.start_time.split(':')[1]);
    const endMinutes = now.getHours() * 60 + now.getMinutes();
    let durationMinutes = endMinutes - startMinutes;
    // Handle same-day vs next day
    if (durationMinutes < 0) durationMinutes += 24 * 60;
    // Also count midnight crossing
    const startDate = activeOutage.date;
    const endDate = now.toLocaleDateString('en-CA');
    if (startDate !== endDate) {
      durationMinutes = (24 * 60 - startMinutes) + endMinutes;
    }
    try {
      const { data, error } = await supabase
        .from('outages')
        .update({ end_time: timeStr, duration_minutes: durationMinutes, is_active: false })
        .eq('id', activeOutage.id)
        .select()
        .single();
      if (error) throw error;
      setActiveOutage(null);
      setOutages(prev => prev.map(o => o.id === data.id ? data : o));
      // Compute day total: outages captured in closure (data.id was still active) + just-ended outage
      const dayTotal = outages
        .filter(o => o.date === data.date && !o.is_active && o.id !== data.id)
        .reduce((sum, o) => sum + (o.duration_minutes || 0), 0)
        + (data.duration_minutes || 0);
      syncCommunityReport(data.date, dayTotal);
      showToast('Power restored. Duration logged.');
    } catch (err) {
      showToast('Failed to end outage: ' + err.message, 'error');
    }
  }, [activeOutage, outages, syncCommunityReport, showToast]);

  const addManualOutage = useCallback(async (fields) => {
    if (!session?.user) return;
    try {
      const payload = { user_id: session.user.id, ...fields };
      if (fields.start_time && fields.end_time) {
        const [sh, sm] = fields.start_time.split(':').map(Number);
        const [eh, em] = fields.end_time.split(':').map(Number);
        let mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins < 0) mins += 24 * 60;
        payload.duration_minutes = mins;
      }
      const { data, error } = await supabase
        .from('outages')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      setOutages(prev => {
        const next = [data, ...prev];
        next.sort((a, b) => {
          if (b.date !== a.date) return b.date.localeCompare(a.date);
          return b.start_time.localeCompare(a.start_time);
        });
        return next;
      });
      if (data.is_active) setActiveOutage(data);
      if (!data.is_active) {
        // outages in closure doesn't include the just-inserted one yet
        const dayTotal = outages
          .filter(o => o.date === data.date && !o.is_active)
          .reduce((sum, o) => sum + (o.duration_minutes || 0), 0)
          + (data.duration_minutes || 0);
        syncCommunityReport(data.date, dayTotal);
      }
      showToast('Outage logged successfully.');
      return { success: true };
    } catch (err) {
      showToast('Failed to log outage: ' + err.message, 'error');
      return { success: false, error: err.message };
    }
  }, [session, outages, syncCommunityReport, showToast]);

  const updateOutage = useCallback(async (id, fields) => {
    try {
      if (fields.start_time && fields.end_time && !fields.is_active) {
        const [sh, sm] = fields.start_time.split(':').map(Number);
        const [eh, em] = fields.end_time.split(':').map(Number);
        let mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins < 0) mins += 24 * 60;
        fields.duration_minutes = mins;
      }
      const { data, error } = await supabase
        .from('outages')
        .update(fields)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setOutages(prev => prev.map(o => o.id === id ? data : o));
      if (data.is_active) setActiveOutage(data);
      else if (activeOutage?.id === id) setActiveOutage(null);
      showToast('Outage updated.');
      return { success: true };
    } catch (err) {
      showToast('Failed to update: ' + err.message, 'error');
      return { success: false };
    }
  }, [activeOutage, showToast]);

  const deleteOutage = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('outages').delete().eq('id', id);
      if (error) throw error;
      setOutages(prev => prev.filter(o => o.id !== id));
      if (activeOutage?.id === id) setActiveOutage(null);
      showToast('Outage deleted.');
    } catch (err) {
      showToast('Failed to delete: ' + err.message, 'error');
    }
  }, [activeOutage, showToast]);

  const saveProfile = useCallback(async (fields) => {
    if (!session?.user) return { success: false };
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: session.user.id, ...fields })
        .select()
        .single();
      if (error) throw error;
      setProfile(data);
      showToast('Profile saved.');
      return { success: true };
    } catch (err) {
      showToast('Failed to save profile: ' + err.message, 'error');
      return { success: false, error: err.message };
    }
  }, [session, showToast]);

  // ── Derived state (must be above early returns — hooks rules) ───────────────

  const complaintReady = useMemo(() => {
    if (!profile || outages.length === 0) return false;
    const map = buildOutageMap(outages);
    return getComplaintReadiness(map, profile.service_band || 'A').ready;
  }, [profile, outages]);

  // ── Document title ────────────────────────────────────────────────────────

  useEffect(() => {
    const TAB_TITLES = {
      dashboard: 'Home',
      log:       'Log',
      community: 'Community',
      analytics: 'Analytics',
      spend:     'Spend',
      report:    'Report',
      settings:  'Settings',
      admin:     'Admin',
      badges:    'Badges',
    };
    document.title = `${TAB_TITLES[currentTab] || 'Home'} · PowerWatch Nigeria`;
  }, [currentTab]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (session === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="flex flex-col items-center gap-5">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-lg">⚡</div>
          </div>
          <p className="text-textMuted text-xs font-medium tracking-widest uppercase">PowerWatch Nigeria</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  const isAdmin = session?.user?.app_metadata?.is_admin === true;
  const setupIncomplete = !profile?.disco || !profile?.service_band;

  const tabContent = {
    dashboard: <Dashboard onViewBadges={() => setCurrentTab('badges')} />,
    log:       <OutageLog />,
    community: <Community />,
    analytics: <Analytics />,
    spend:     <SpendTracker />,
    report:    <ReportGenerator />,
    settings:  <Settings onSaved={() => setCurrentTab('dashboard')} />,
    admin:     <Admin />,
    badges:    <Badges onBack={() => setCurrentTab('dashboard')} />,
  };

  return (
    <AuthContext.Provider value={{ session, showToast }}>
      <ProfileContext.Provider value={{ profile, profileLoading, saveProfile }}>
        <OutagesContext.Provider value={{
          outages, outagesLoading, activeOutage,
          startOutage, endOutage, addManualOutage,
          updateOutage, deleteOutage, refreshOutages: () => fetchOutages(session.user.id),
          confirmations, addConfirmation,
        }}>
          <div className="flex flex-col min-h-screen bg-bg text-textPrimary lg:pl-[220px]">
            {/* Top bar */}
            <header
              className="sticky top-0 z-40 flex items-center justify-between px-4 h-14"
              style={{
                backgroundColor: activeOutage ? 'rgba(192,57,43,0.97)' : 'rgba(11,15,26,0.88)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: `1px solid ${activeOutage ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.07)'}`,
                boxShadow: activeOutage ? '0 4px 24px rgba(229,57,53,0.2)' : 'none',
                transition: 'background-color 0.4s ease, box-shadow 0.4s ease',
              }}
            >
              <div className="flex items-center gap-2.5">
                {/* Lightning bolt logo square */}
                <div
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'linear-gradient(135deg, #00A651 0%, #007a3d 100%)',
                    boxShadow: '0 0 12px rgba(0,166,81,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" />
                  </svg>
                </div>
                <span
                  style={{
                    fontFamily: 'Syne, system-ui, sans-serif',
                    fontWeight: 800,
                    fontSize: 17,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  <span style={{ color: '#F0F4FF' }}>Power</span><span style={{ color: '#00A651' }}>Watch</span>
                </span>
                <span
                  className="hidden sm:inline-block"
                  style={{
                    background: 'rgba(0,166,81,0.1)',
                    border: '1px solid rgba(0,166,81,0.2)',
                    color: '#00A651',
                    fontSize: 10,
                    fontFamily: 'Syne, system-ui, sans-serif',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderRadius: 100,
                    padding: '2px 8px',
                  }}
                >
                  Nigeria
                </span>
              </div>
              <button
                onClick={() => setCurrentTab(currentTab === 'settings' ? 'dashboard' : 'settings')}
                className="btn-press w-9 h-9 rounded-btn flex items-center justify-center"
                style={{ color: '#8B95B0', backgroundColor: 'rgba(255,255,255,0.05)' }}
                aria-label={currentTab === 'settings' ? 'Back to Home' : 'Settings'}
              >
                {currentTab === 'settings' ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                )}
              </button>
            </header>

            {/* Offline banner */}
            {isOffline && (
              <div
                className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold"
                style={{ backgroundColor: '#78350f', color: '#fbbf24', borderBottom: '1px solid #92400e' }}
              >
                <span>●</span> You're offline — data may be out of date
              </div>
            )}

            {/* Active outage banner */}
            <ActiveOutageBanner onNavigateToLog={() => setCurrentTab('log')} />

            {/* Page content */}
            <main className="flex-1 overflow-y-auto pb-16">
              <div key={currentTab} className="page-enter max-w-2xl mx-auto w-full">
                {tabContent[currentTab] || tabContent['dashboard']}
              </div>
            </main>

            {/* Bottom nav — always visible so users can leave any tab */}
            <NavBar
              currentTab={currentTab}
              onTabChange={setCurrentTab}
              isAdmin={isAdmin}
              setupIncomplete={setupIncomplete}
              complaintReady={complaintReady}
            />
          </div>
          <Toast toasts={toasts} />
          {showOnboarding && (
            <Onboarding onComplete={() => { setShowOnboarding(false); setCurrentTab('dashboard'); }} />
          )}
        </OutagesContext.Provider>
      </ProfileContext.Provider>
    </AuthContext.Provider>
  );
}
