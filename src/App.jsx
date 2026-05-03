import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.js';
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
            backgroundColor: t.type === 'error' ? '#E74C3C' : '#1a2a1f',
            color: '#F8FAFC',
            border: `1px solid ${t.type === 'error' ? 'rgba(255,255,255,0.12)' : 'rgba(46,204,113,0.35)'}`,
            boxShadow: t.type === 'error'
              ? '0 4px 20px rgba(231,76,60,0.3), 0 1px 0 rgba(255,255,255,0.08) inset'
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
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [toasts, setToasts] = useState([]);

  // ── Toast helpers ──────────────────────────────────────────────────────────

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
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
      if (!data) setCurrentTab('settings');
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

  useEffect(() => {
    if (session?.user) {
      fetchProfile(session.user.id);
      fetchOutages(session.user.id);
    } else if (session === null) {
      setProfile(null);
      setOutages([]);
      setActiveOutage(null);
    }
  }, [session, fetchProfile, fetchOutages]);

  // ── Outage mutations ───────────────────────────────────────────────────────

  const startOutage = useCallback(async () => {
    if (!session?.user) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const timeStr = now.toTimeString().slice(0, 5);  // HH:MM
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
      setOutages(prev => {
        const next = prev.map(o => o.id === data.id ? data : o);
        // Compute total outage minutes for the day from the updated list
        const dayTotal = next
          .filter(o => o.date === data.date && !o.is_active)
          .reduce((sum, o) => sum + (o.duration_minutes || 0), 0);
        syncCommunityReport(data.date, dayTotal);
        return next;
      });
      showToast('Power restored. Duration logged.');
    } catch (err) {
      showToast('Failed to end outage: ' + err.message, 'error');
    }
  }, [activeOutage, syncCommunityReport, showToast]);

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
        if (!data.is_active) {
          const dayTotal = next
            .filter(o => o.date === data.date && !o.is_active)
            .reduce((sum, o) => sum + (o.duration_minutes || 0), 0);
          syncCommunityReport(data.date, dayTotal);
        }
        return next;
      });
      if (data.is_active) setActiveOutage(data);
      showToast('Outage logged successfully.');
      return { success: true };
    } catch (err) {
      showToast('Failed to log outage: ' + err.message, 'error');
      return { success: false, error: err.message };
    }
  }, [session, syncCommunityReport, showToast]);

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

  // Silently upsert one anonymised row for the given date into community_reports.
  // Called after any mutation that completes an outage, if the user has opted in.
  const syncCommunityReport = useCallback(async (date, outageMinutesForDay) => {
    if (!profile?.community_opt_in || !profile?.lga || !session?.user) return;
    await supabase.from('community_reports').upsert({
      user_id:        session.user.id,
      report_date:    date,
      lga:            profile.lga,
      disco:          profile.disco   || null,
      service_band:   profile.service_band || null,
      outage_minutes: outageMinutesForDay,
    }, { onConflict: 'user_id,report_date' });
    // failures are intentionally swallowed — sync is best-effort
  }, [profile, session]);

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

  const tabContent = {
    dashboard: <Dashboard />,
    log:       <OutageLog />,
    community: <Community />,
    analytics: <Analytics />,
    report:    <ReportGenerator />,
    settings:  <Settings onSaved={() => setCurrentTab('dashboard')} />,
    admin:     <Admin />,
  };

  return (
    <AuthContext.Provider value={{ session, showToast }}>
      <ProfileContext.Provider value={{ profile, profileLoading, saveProfile }}>
        <OutagesContext.Provider value={{
          outages, outagesLoading, activeOutage,
          startOutage, endOutage, addManualOutage,
          updateOutage, deleteOutage, refreshOutages: () => fetchOutages(session.user.id),
        }}>
          <div className="flex flex-col min-h-screen bg-bg text-textPrimary">
            {/* Top bar */}
            <header
              className="sticky top-0 z-40 flex items-center justify-between px-4 h-14"
              style={{
                backgroundColor: activeOutage ? 'rgba(192,57,43,0.97)' : 'rgba(10,17,33,0.94)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderBottom: `1px solid ${activeOutage ? 'rgba(255,255,255,0.08)' : 'rgba(51,65,85,0.5)'}`,
                boxShadow: activeOutage ? '0 4px 24px rgba(231,76,60,0.2)' : 'none',
                transition: 'background-color 0.4s ease, box-shadow 0.4s ease',
              }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg" aria-hidden>⚡</span>
                <span className="font-black text-base tracking-tight text-textPrimary">
                  PowerWatch
                </span>
                <span
                  className="text-xs font-semibold px-1.5 py-0.5 rounded-md hidden sm:block"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}
                >
                  Nigeria
                </span>
              </div>
              <button
                onClick={() => setCurrentTab('settings')}
                className="btn-press w-9 h-9 rounded-btn flex items-center justify-center"
                style={{ color: '#94A3B8', backgroundColor: 'rgba(255,255,255,0.05)' }}
                aria-label="Settings"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </header>

            {/* Active outage banner */}
            <ActiveOutageBanner onNavigateToLog={() => setCurrentTab('log')} />

            {/* Page content */}
            <main className="flex-1 overflow-y-auto pb-20">
              <div key={currentTab} className="page-enter max-w-2xl mx-auto w-full">
                {tabContent[currentTab] || tabContent['dashboard']}
              </div>
            </main>

            {/* Bottom nav */}
            {currentTab !== 'settings' && (
              <NavBar currentTab={currentTab} onTabChange={setCurrentTab} isAdmin={isAdmin} />
            )}
          </div>
          <Toast toasts={toasts} />
        </OutagesContext.Provider>
      </ProfileContext.Provider>
    </AuthContext.Provider>
  );
}
