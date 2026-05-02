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
          className={`px-4 py-3 rounded-btn text-sm font-medium shadow-lg pointer-events-auto transition-all
            ${t.type === 'error' ? 'bg-danger text-white' : 'bg-accent text-bg'}`}
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
      setOutages(prev => prev.map(o => o.id === data.id ? data : o));
      showToast('Power restored. Duration logged.');
    } catch (err) {
      showToast('Failed to end outage: ' + err.message, 'error');
    }
  }, [activeOutage, showToast]);

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
      showToast('Outage logged successfully.');
      return { success: true };
    } catch (err) {
      showToast('Failed to log outage: ' + err.message, 'error');
      return { success: false, error: err.message };
    }
  }, [session, showToast]);

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

  // ── Render ─────────────────────────────────────────────────────────────────

  if (session === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-textMuted text-sm">Loading PowerWatch Nigeria…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  const tabContent = {
    dashboard: <Dashboard />,
    log: <OutageLog />,
    analytics: <Analytics />,
    report: <ReportGenerator />,
    settings: <Settings onSaved={() => setCurrentTab('dashboard')} />,
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
              className="sticky top-0 z-40 flex items-center justify-between px-4 h-14 transition-colors duration-300"
              style={{ backgroundColor: activeOutage ? '#E74C3C' : '#1E293B', borderBottom: '1px solid #334155' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight" style={{ color: activeOutage ? '#fff' : '#F8FAFC' }}>
                  ⚡ PowerWatch
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-black/20 text-white hidden sm:block">
                  Nigeria
                </span>
              </div>
              <button
                onClick={() => setCurrentTab('settings')}
                className="p-2 rounded-btn hover:bg-white/10 transition-colors"
                aria-label="Settings"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </header>

            {/* Active outage banner */}
            <ActiveOutageBanner onNavigateToLog={() => setCurrentTab('log')} />

            {/* Page content */}
            <main className="flex-1 overflow-y-auto pb-20">
              <div className="max-w-2xl mx-auto w-full">
                {tabContent[currentTab] || tabContent['dashboard']}
              </div>
            </main>

            {/* Bottom nav */}
            {currentTab !== 'settings' && (
              <NavBar currentTab={currentTab} onTabChange={setCurrentTab} />
            )}
          </div>
          <Toast toasts={toasts} />
        </OutagesContext.Provider>
      </ProfileContext.Provider>
    </AuthContext.Provider>
  );
}
