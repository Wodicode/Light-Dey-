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
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccessMsg('Account created! Check your email to confirm your address, then sign in.');
        setMode('signin');
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
    if (msg.includes('Email not confirmed')) return 'Please confirm your email address before signing in.';
    if (msg.includes('already registered')) return 'An account with this email already exists. Sign in instead.';
    if (msg.includes('Password should be')) return 'Password must be at least 6 characters.';
    return msg;
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚡</div>
          <h1 className="text-2xl font-bold text-textPrimary tracking-tight">PowerWatch Nigeria</h1>
          <p className="text-textMuted text-sm mt-1">Track your electricity supply. Know your rights.</p>
        </div>

        {/* Card */}
        <div
          className="rounded-card p-6"
          style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}
        >
          <h2 className="text-lg font-semibold text-textPrimary mb-5">
            {mode === 'signin' && 'Sign in to your account'}
            {mode === 'signup' && 'Create an account'}
            {mode === 'reset' && 'Reset your password'}
          </h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-btn text-sm text-white" style={{ backgroundColor: '#E74C3C22', border: '1px solid #E74C3C', color: '#fca5a5' }}>
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 px-4 py-3 rounded-btn text-sm" style={{ backgroundColor: '#2ECC7122', border: '1px solid #2ECC71', color: '#86efac' }}>
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-textMuted mb-1">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 rounded-btn text-sm text-textPrimary placeholder-textMuted/50 outline-none focus:ring-2 focus:ring-accent"
                style={{ backgroundColor: '#0F172A', border: '1px solid #334155' }}
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-btn text-sm text-textPrimary placeholder-textMuted/50 outline-none focus:ring-2 focus:ring-accent"
                  style={{ backgroundColor: '#0F172A', border: '1px solid #334155' }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-btn font-semibold text-sm transition-opacity disabled:opacity-60"
              style={{ backgroundColor: '#2ECC71', color: '#0F172A' }}
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
