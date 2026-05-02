import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { supabaseMisconfigured } from './supabaseClient.js';
import './index.css';

if (supabaseMisconfigured) {
  document.getElementById('root').innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0F172A;font-family:Inter,system-ui,sans-serif">
      <div style="max-width:420px;width:100%;background:#1E293B;border:1px solid #334155;border-radius:12px;padding:32px">
        <div style="font-size:40px;text-align:center;margin-bottom:16px">⚡</div>
        <h1 style="color:#F8FAFC;font-size:20px;font-weight:700;margin-bottom:8px;text-align:center">Setup Required</h1>
        <p style="color:#94A3B8;font-size:14px;margin-bottom:20px;text-align:center;line-height:1.5">
          PowerWatch Nigeria needs your Supabase credentials to run.
        </p>
        <ol style="color:#94A3B8;font-size:13px;line-height:2.2;padding-left:20px">
          <li>Create a free project at <a href="https://supabase.com" style="color:#2ECC71">supabase.com</a></li>
          <li>Go to Project Settings &rarr; API</li>
          <li>In Vercel: Settings &rarr; Environment Variables</li>
          <li>Add <code style="background:#0F172A;padding:2px 6px;border-radius:4px;color:#F8FAFC">VITE_SUPABASE_URL</code></li>
          <li>Add <code style="background:#0F172A;padding:2px 6px;border-radius:4px;color:#F8FAFC">VITE_SUPABASE_ANON_KEY</code></li>
          <li>Redeploy the project on Vercel</li>
        </ol>
      </div>
    </div>
  `;
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
