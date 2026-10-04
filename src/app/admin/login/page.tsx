'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Lock, ArrowRight, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0C0A] flex flex-col justify-center items-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full border border-[#C8AD7F]/40 flex items-center justify-center text-[#C8AD7F] mx-auto mb-4 shadow-[0_0_15px_rgba(200,173,127,0.2)]">
            <Camera className="w-6 h-6" />
          </div>
          <h1 className="font-headline text-3xl uppercase tracking-wider text-[#F2EDE4]">
            Cinematic Chapters
          </h1>
          <span className="font-condensed text-xs uppercase tracking-[0.25em] text-[#806849]">
            Photographer Control Center
          </span>
        </div>

        {/* Login Card */}
        <div className="glass-card-smoky rounded-2xl p-8 border border-[#302921]">
          <h2 className="font-headline text-xl uppercase tracking-wide text-[#F2EDE4] mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#C8AD7F]" />
            Studio Access
          </h2>
          <p className="text-xs text-[#B7AEA2] mb-6 font-light">
            Authorized photographer credentials only. All operations are strictly audited.
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
                Admin Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cinematicchapters.co.uk"
                className="w-full bg-[#14120E] border border-[#302921] rounded-lg px-4 py-2.5 text-xs text-[#F2EDE4] placeholder-[#806849] focus:outline-none focus:border-[#C8AD7F]"
              />
            </div>

            <div>
              <label className="font-condensed text-xs uppercase tracking-wider text-[#806849] block mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#14120E] border border-[#302921] rounded-lg px-4 py-2.5 text-xs text-[#F2EDE4] placeholder-[#806849] focus:outline-none focus:border-[#C8AD7F]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full capsule-button-gold text-xs py-3 mt-4 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Enter Studio Panel'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#302921] text-center">
            <span className="text-[11px] text-[#806849]">
              Default Seed: <code className="text-[#C8AD7F]">admin@cinematicchapters.co.uk</code>
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
