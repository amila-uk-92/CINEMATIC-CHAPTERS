'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ArrowRight, AlertCircle, Camera } from 'lucide-react';

export default function ClientLoginPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/client/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: accessToken.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired access key.');
      }

      router.push('/client/gallery');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0C0A] flex flex-col justify-center items-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full border border-[#C8AD7F]/40 flex items-center justify-center text-[#C8AD7F] mx-auto mb-4 shadow-[0_0_15px_rgba(200,173,127,0.2)]">
            <Camera className="w-6 h-6" />
          </div>
          <h1 className="font-headline text-3xl uppercase tracking-wider text-[#F2EDE4]">
            Cinematic Chapters
          </h1>
          <span className="font-condensed text-xs uppercase tracking-[0.25em] text-[#806849]">
            Private Client Portal
          </span>
        </div>

        <div className="glass-card-smoky rounded-2xl p-8 border border-[#302921]">
          <h2 className="font-headline text-xl uppercase tracking-wide text-[#F2EDE4] mb-2 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#C8AD7F]" />
            Enter Access Key
          </h2>
          <p className="text-xs text-[#B7AEA2] mb-6 font-light">
            Please enter the private security key provided in your delivery email to unlock your photo collection.
          </p>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-condensed text-xs uppercase tracking-wider text-[#806849] block mb-1">
                Security Access Token
              </label>
              <input
                type="text"
                required
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value.toUpperCase())}
                placeholder="e.g. PORTAL-DEMO-2026"
                className="w-full bg-[#14120E] border border-[#302921] rounded-lg px-4 py-2.5 text-xs text-[#F2EDE4] font-mono tracking-wider placeholder-[#806849] focus:outline-none focus:border-[#C8AD7F]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full capsule-button-gold text-xs py-3 mt-4 disabled:opacity-50"
            >
              <span>{loading ? 'Unlocking Gallery...' : 'Unlock Private Gallery'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#302921] text-center">
            <span className="text-[11px] text-[#806849]">
              Demo Passkey: <code className="text-[#C8AD7F]">PORTAL-DEMO-2026</code>
            </span>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a href="/" className="font-condensed text-xs uppercase tracking-widest text-[#806849] hover:text-[#C8AD7F]">
            ← Return to Public Portfolio
          </a>
        </div>
      </div>
    </div>
  );
}
