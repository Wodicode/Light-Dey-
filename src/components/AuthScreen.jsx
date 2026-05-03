import React, { useState } from 'react';
import { supabase } from '../supabaseClient.js';

export default function AuthScreen() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const clearMessages = () => { setError(''); setSuccessMsg(''); };

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
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        // If email confirmation is disabled, Supabase returns a session immediately
        // and onAuthStateChange in App.jsx will navigate automatically.
        // If somehow a session wasn't created, fall back to sign-in.
        if (!data.session) {
          setSuccessMsg('Account created! Sign in with your new credentials.');
          setMode('signin');
        }
        return;
      }

      // signin
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // App.jsx auth listener will handle navigation
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
    if (msg.toLowerCase().includes('rate limit')) return 'Too many attempts — please wait a few minutes before trying again.';
    if (msg.toLowerCase().includes('email')) return 'Email could not be sent. Please wait a moment and try again.';
    return msg;
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-btn text-sm text-textPrimary outline-none transition-all duration-150';
  const inputSty = { backgroundColor: '#0a1120', border: '1px solid #334155', boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset' };
  const inputFocusSty = { border: '1px solid rgba(46,204,113,0.5)', boxShadow: '0 0 0 3px rgba(46,204,113,0.12), 0 1px 0 rgba(255,255,255,0.03) inset' };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-3xl"
            style={{
              background: 'linear-gradient(135deg, #1a2a1f 0%, #1E293B 100%)',
              boxShadow: '0 0 0 1px rgba(46,204,113,0.2), 0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            ⚡
          </div>
          <h1 className="text-2xl font-black text-textPrimary tracking-tight">PowerWatch Nigeria</h1>
          <p className="text-xs font-medium mt-1.5 uppercase tracking-widest" style={{ color: '#475569' }}>
            Track supply · Know your rights
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-card p-6"
          style={{
            backgroundColor: '#1E293B',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 24px 48px rgba(0,0,0,0.4)',
          }}
        >
          <h2 className="text-sm font-black uppercase tracking-widest mb-5" style={{ color: '#64748B' }}>
            {mode === 'signin' && 'Sign in'}
            {mode === 'signup' && 'Create account'}
            {mode === 'reset' && 'Reset password'}
          </h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-btn text-xs font-medium" style={{ backgroundColor: '#E74C3C12', borderLeft: '3px solid #E74C3C', color: '#fca5a5' }}>
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 px-4 py-3 rounded-btn text-xs font-medium" style={{ backgroundColor: '#2ECC7112', borderLeft: '3px solid #2ECC71', color: '#86efac' }}>
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#475569' }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                className={inputCls}
                style={inputSty}
                onFocus={e => Object.assign(e.target.style, inputFocusSty)}
                onBlur={e => Object.assign(e.target.style, inputSty)}
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#475569' }}>Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  className={inputCls}
                  style={inputSty}
                  onFocus={e => Object.assign(e.target.style, inputFocusSty)}
                  onBlur={e => Object.assign(e.target.style, inputSty)}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-press w-full py-3 rounded-btn font-black text-sm uppercase tracking-widest disabled:opacity-50"
              style={{
                background: 'linear-gradient(180deg, #2ECC71 0%, #27AE60 100%)',
                color: '#0a1a0f',
                boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 4px 12px rgba(46,204,113,0.2)',
              }}
            >
              {loading ? 'Please wait…' : (
                mode === 'signin' ? 'Sign In' :
                mode === 'signup' ? 'Create Account' :
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
                    style={{ color: '#2ECC71' }}
                  >
                    Sign up
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
                  style={{ color: '#2ECC71' }}
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

        <p className="text-center text-xs text-textMuted mt-6">
          Helping Nigerian electricity consumers track supply under the NERC SBT framework.
        </p>
      </div>
    </div>
  );
}
