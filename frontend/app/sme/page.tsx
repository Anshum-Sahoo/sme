'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConsentShell from '@/components/sme/ConsentShell';
import { CheckCircleIcon, LockIcon } from '@/components/sme/icons';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function SmeDashboardPage() {
  const router = useRouter();

  // Set default state to an empty string per requirements
  const [consentId, setConsentId] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openConsent(event: FormEvent) {
    event.preventDefault();
    const id = consentId.trim();
    if (!id) {
      setError('Please enter a Consent ID.');
      return;
    }

    setChecking(true);
    setError(null);
    try {
      // Verify the exact ID exists on the backend before navigating.
      const res = await fetch(`${API_BASE}/api/consents/${encodeURIComponent(id)}`, {
        cache: 'no-store',
      });
      if (res.status === 404) {
        setError(`Consent not found: "${id}". Enter the exact Consent ID shown on the bank's application page.`);
        return;
      }
      if (!res.ok) {
        setError('Could not verify the Consent ID. Please try again.');
        return;
      }
      router.push(`/sme/${encodeURIComponent(id)}`);
    } catch {
      setError('Could not connect to the backend. Please try again.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <ConsentShell active="dashboard">
      <div className="mx-auto w-full max-w-6xl pt-2 lg:pt-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16 lg:items-start">

          {/* Left Column: Primary Actions & Lookup Form */}
          <div className="space-y-6 lg:space-y-8">
            <div className="flex items-center justify-between gap-3 md:justify-start md:gap-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                <CheckCircleIcon />
                Verified Institution
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <LockIcon size={13} color="#64748b" />
                256-bit TLS Encrypted
              </span>
            </div>

            <section>
              <h1 className="text-[20px] font-semibold leading-7 tracking-[-0.025em] text-slate-900 md:text-[26px] md:leading-9">
                Review pending data-access requests.
              </h1>
              <p className="mt-2 text-[14px] leading-5 text-slate-500 md:mt-3 md:text-[15px] md:leading-6">
                Open a consent ID issued by the bank to inspect purpose, data scope, and expiry before you
                approve or reject sharing.
              </p>
            </section>

            <form
              onSubmit={openConsent}
              className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_0_rgba(15,23,42,0.04)]"
            >
              <div>
                <label htmlFor="consent-id" className="mb-2 block text-[12px] font-medium uppercase tracking-[0.12em] text-slate-400">
                  Consent ID
                </label>
                <input
                  id="consent-id"
                  value={consentId}
                  onChange={(e) => {
                    setConsentId(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter Consent ID"
                  autoComplete="off"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900 focus:shadow-[0_0_0_1px_#0f172a] transition-all"
                />
              </div>

              {error && (
                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={checking}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-[#0f172a] text-[14px] font-medium text-white hover:bg-[#1e293b] disabled:bg-slate-400 shadow-sm transition-colors"
              >
                {checking ? 'Checking…' : 'Open Consent Portal'}
              </button>
            </form>
          </div>

          {/* Right Column: Supporting Information Panel */}
          <div className="rounded-xl border border-slate-200/60 bg-slate-100/70 p-6 lg:mt-14">
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-800">
              About this portal
            </h3>
            <p className="text-[13px] leading-6 text-slate-500">
              The bank creates the request first. Enter the consent ID provided by the bank to review the request.
            </p>
          </div>

        </div>
      </div>
    </ConsentShell>
  );
}
