import React, { useState } from 'react';
import { supabase } from '../supabaseClient.js';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function Check() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke="#00A651" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BoltLogo({ size = 36, radius = 9 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: 'linear-gradient(135deg, #00A651 0%, #007a3d 100%)',
      boxShadow: '0 0 16px rgba(0,166,81,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={size * 0.44} height={size * 0.44} viewBox="0 0 24 24" fill="white">
        <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" />
      </svg>
    </div>
  );
}

const FEATURES = [
  'Log outages with one tap — see total downtime tracked live',
  'Compare your supply against your NERC Band minimum hours',
  'Generate a ready-to-send complaint letter the moment you qualify',
  'See what your LGA is experiencing with community-wide data',
];

const STATS = [
  ['6', 'DisCos covered'],
  ['5', 'Service Bands'],
  ['NERC', 'Complaint-ready'],
];

export default function AuthScreen() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const clearMessages = () => { setError(''); setSuccessMsg(''); };

  const handleGoogleSignIn = async () => {
    clearMessages();
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setError('Google sign-in failed. Please try email instead.');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setSuccessMsg('Password reset email sent. Check your inbox.');
        return;
      }
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setSuccessMsg('Account created! Sign in with your new credentials.');
          setMode('signin');
        }
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setError(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const friendlyError = (msg) => {
    if (msg.includes('Invalid login credentials')) return 'Incorrect email or password.';
    if (msg.includes('Email not confirmed')) return 'Please confirm your email address before signing in. Check your inbox (and spam folder).';
    if (msg.includes('already registered')) return 'An account with this email already exists. Sign in instead.';
    if (msg.includes('Password should be')) return 'Password must be at least 6 characters.';
    if (msg.toLowerCase().includes('rate limit')) return 'Too many attempts — please wait a few minutes.';
    if (msg.toLowerCase().includes('email')) return 'Email could not be sent. Please wait a moment and try again.';
    return msg;
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-btn text-sm text-textPrimary outline-none transition-all duration-150';
  const inputSty = { backgroundColor: '#0B0F1A', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset' };
  const inputFocusSty = { backgroundColor: '#0B0F1A', border: '1px solid rgba(0,166,81,0.5)', boxShadow: '0 0 0 3px rgba(0,166,81,0.12), 0 1px 0 rgba(255,255,255,0.03) inset' };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0B0F1A' }}>

      {/* ── Left: Marketing panel (lg+) ───────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between lg:w-[52%] xl:w-[56%] px-12 xl:px-16 py-12 relative overflow-hidden"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Ambient green glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 65% 55% at 15% 55%, rgba(0,166,81,0.09) 0%, transparent 70%)',
        }} />
        {/* Decorative large bolt */}
        <div
          className="absolute right-0 bottom-8 select-none pointer-events-none"
          style={{ fontSize: 320, opacity: 0.025, color: '#00A651', lineHeight: 1 }}
          aria-hidden
        >⚡</div>

        {/* Logo */}
        <div className="flex items-center gap-2.5 relative z-10">
          <BoltLogo size={36} radius={9} />
          <span style={{
            fontFamily: 'Syne, system-ui, sans-serif',
            fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em', color: '#F0F4FF',
          }}>
            PowerWatch Nigeria
          </span>
        </div>

        {/* Main copy */}
        <div className="flex flex-col gap-8 relative z-10">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-5" style={{
              color: '#00A651', fontFamily: 'Syne, system-ui, sans-serif',
            }}>
              — Track your power supply
            </p>
            <h1 style={{
              fontFamily: 'Syne, system-ui, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(34px, 3.2vw, 50px)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: '#F0F4FF',
            }}>
              Know when your<br />
              <span style={{ color: '#00A651' }}>DisCo owes you.</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed" style={{ color: '#8B95B0', maxWidth: 420 }}>
              PowerWatch logs your outages, tracks your supply against NERC Band minimums, and generates a formal complaint letter the moment you qualify — all in one place.
            </p>
          </div>

          {/* Feature list */}
          <div className="flex flex-col gap-3.5">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="shrink-0 mt-0.5 rounded-full flex items-center justify-center"
                  style={{
                    width: 20, height: 20,
                    backgroundColor: 'rgba(0,166,81,0.12)',
                    border: '1px solid rgba(0,166,81,0.3)',
                  }}
                >
                  <Check />
                </div>
                <span className="text-sm leading-snug" style={{ color: '#8B95B0' }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Stat strip */}
          <div className="flex gap-8">
            {STATS.map(([val, label]) => (
              <div key={label}>
                <p style={{
                  fontFamily: 'Syne, system-ui, sans-serif',
                  fontWeight: 800, fontSize: 24,
                  color: '#F0F4FF', lineHeight: 1,
                }}>{val}</p>
                <p className="text-xs mt-1" style={{ color: '#4A5470' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs relative z-10" style={{ color: '#4A5470' }}>
          Serving customers of AEDC · EKEDC · IE · PHED · ENUGU DisCo · IBEDC
        </p>
      </div>

      {/* ── Right: Form panel ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 sm:px-10">

        {/* Mobile-only header */}
        <div className="lg:hidden text-center mb-8 px-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BoltLogo size={32} radius={8} />
            <span style={{
              fontFamily: 'Syne, system-ui, sans-serif',
              fontWeight: 800, fontSize: 16, color: '#F0F4FF',
            }}>
              PowerWatch Nigeria
            </span>
          </div>
          <h2 style={{
            fontFamily: 'Syne, system-ui, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(22px, 6vw, 28px)',
            letterSpacing: '-0.02em',
            color: '#F0F4FF',
            lineHeight: 1.15,
          }}>
            Know when your{' '}
            <span style={{ color: '#00A651' }}>DisCo owes you.</span>
          </h2>
          <p className="text-sm mt-3 leading-relaxed" style={{ color: '#8B95B0' }}>
            Log outages, track supply, and generate NERC complaint letters automatically.
          </p>

          {/* Mobile mini feature list */}
          <div className="flex flex-col gap-2 mt-5 text-left">
            {FEATURES.slice(0, 3).map((f, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div
                  className="shrink-0 mt-0.5 rounded-full flex items-center justify-center"
                  style={{ width: 18, height: 18, backgroundColor: 'rgba(0,166,81,0.12)', border: '1px solid rgba(0,166,81,0.3)' }}
                >
                  <Check />
                </div>
                <span className="text-xs leading-snug" style={{ color: '#8B95B0' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div className="w-full max-w-sm">
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20,
            padding: 28,
            boxShadow: '0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
          }}>
            <h2 style={{
              fontFamily: 'Syne, system-ui, sans-serif',
              fontWeight: 700, fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              color: '#4A5470', marginBottom: 20,
            }}>
              {mode === 'signin' && 'Sign in'}
              {mode === 'signup' && 'Create account'}
              {mode === 'reset' && 'Reset password'}
            </h2>

            {mode !== 'reset' && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="btn-press w-full py-3 rounded-btn font-semibold text-sm flex items-center justify-center gap-2.5 disabled:opacity-50 mb-4"
                  style={{ backgroundColor: '#F8FAFC', color: '#1a1a1a', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', borderRadius: 10 }}
                >
                  <GoogleIcon />
                  {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                </button>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />
                  <span className="text-xs font-medium" style={{ color: '#4A5470' }}>or</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />
                </div>
              </>
            )}

            {error && (
              <div className="mb-4 px-4 py-3 rounded-btn text-xs font-medium" style={{ backgroundColor: 'rgba(229,57,53,0.06)', borderLeft: '3px solid #E53935', color: '#fca5a5' }}>
                {error}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 px-4 py-3 rounded-btn text-xs font-medium" style={{ backgroundColor: 'rgba(0,166,81,0.06)', borderLeft: '3px solid #00A651', color: '#6ee7a0' }}>
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4A5470' }}>Email</label>
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email" placeholder="you@example.com"
                  className={inputCls} style={inputSty}
                  onFocus={e => Object.assign(e.target.style, inputFocusSty)}
                  onBlur={e => Object.assign(e.target.style, inputSty)}
                />
              </div>
              {mode !== 'reset' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4A5470' }}>Password</label>
                  <input
                    type="password" required value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    placeholder="••••••••"
                    className={inputCls} style={inputSty}
                    onFocus={e => Object.assign(e.target.style, inputFocusSty)}
                    onBlur={e => Object.assign(e.target.style, inputSty)}
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn-press btn-glow w-full py-3 rounded-btn font-black text-sm uppercase tracking-widest disabled:opacity-50"
                style={{
                  background: 'linear-gradient(180deg, #00A651 0%, #008f47 100%)',
                  color: '#fff',
                  boxShadow: '0 0 24px rgba(0,166,81,0.3), 0 1px 0 rgba(255,255,255,0.15) inset',
                }}
              >
                {loading ? 'Please wait…' : (
                  mode === 'signin' ? 'Sign In →' :
                  mode === 'signup' ? 'Create Account →' :
                  'Send Reset Email'
                )}
              </button>
            </form>

            <div className="mt-5 flex flex-col items-center gap-3 text-sm">
              {mode === 'signin' && (
                <>
                  <button
                    onClick={() => { setMode('reset'); clearMessages(); }}
                    className="text-textMuted hover:text-textPrimary transition-colors"
                  >
                    Forgot password?
                  </button>
                  <p className="text-textMuted">
                    Don't have an account?{' '}
                    <button
                      onClick={() => { setMode('signup'); clearMessages(); }}
                      className="font-medium hover:underline"
                      style={{ color: '#00A651' }}
                    >
                      Sign up free
                    </button>
                  </p>
                </>
              )}
              {mode === 'signup' && (
                <p className="text-textMuted">
                  Already have an account?{' '}
                  <button
                    onClick={() => { setMode('signin'); clearMessages(); }}
                    className="font-medium hover:underline"
                    style={{ color: '#00A651' }}
                  >
                    Sign in
                  </button>
                </p>
              )}
              {mode === 'reset' && (
                <button
                  onClick={() => { setMode('signin'); clearMessages(); }}
                  className="text-textMuted hover:text-textPrimary transition-colors"
                >
                  Back to sign in
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-xs mt-5" style={{ color: '#4A5470' }}>
            Helping Nigerian electricity consumers track supply under the NERC SBT framework.
          </p>
        </div>
      </div>
    </div>
  );
}
