'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ConsentShell from '@/components/sme/ConsentShell';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// Mirrors ConsentResponse in backend routes.py (contract unchanged).
interface SmeConsent {
  consent_id: string;
  application_id: string;
  status: 'PENDING' | 'APPROVED' | 'DATA_READY' | 'REJECTED' | string;
  requested_data: string[];
  purpose: string;
  expires_at: string;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function SmeConsentPage() {
  const params = useParams<{ consent_id: string }>();
  const rawId = Array.isArray(params?.consent_id) ? params.consent_id[0] : params?.consent_id;
  const consentId = rawId ? safeDecode(rawId) : '';

  const [consent, setConsent] = useState<SmeConsent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [acting, setActing] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // GET /api/consents/{consent_id}
  const fetchConsent = useCallback(async (): Promise<boolean> => {
    if (!consentId) return false;
    try {
      const res = await fetch(`${API_BASE}/api/consents/${encodeURIComponent(consentId)}`, {
        cache: 'no-store',
      });
      if (res.status === 404) {
        setConsent(null);
        setNotFound(true);
        return false;
      }
      if (!res.ok) {
        setError('Failed to load consent request.');
        return false;
      }
      const data: SmeConsent = await res.json();
      setConsent(data);
      setNotFound(false);
      return true;
    } catch {
      setError('Could not connect to the backend to load the consent request.');
      return false;
    }
  }, [consentId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setMessage(null);
      await fetchConsent();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchConsent]);

  // POST /api/consents/{consent_id}/approve | /reject, then re-read state from the backend
  async function decide(action: 'approve' | 'reject') {
    if (!consent) return;
    setActing(action);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/consents/${encodeURIComponent(consent.consent_id)}/${action}`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || `Failed to ${action} consent.`);
      }
      // Refresh regardless: on failure (e.g. already decided) this shows the true state.
      const ok = await fetchConsent();
      if (res.ok && ok) {
        setMessage(action === 'approve' ? 'Consent approved. The bank can now access the permitted data.' : 'Consent rejected. No data will be shared.');
      }
    } catch {
      setError(`Could not reach the backend to ${action} the consent.`);
    } finally {
      setActing(null);
    }
  }

  const statusClass = (status: string) =>
    status === 'APPROVED' || status === 'DATA_READY'
      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
      : status === 'REJECTED'
      ? 'bg-rose-100 text-rose-800 border border-rose-300'
      : 'bg-blue-100 text-blue-800 border border-blue-300';

  const formatScope = (s: string) => s.replace(/_/g, ' ');
  const formatExpiry = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString();
  };

  return (
    <ConsentShell active="consent" consentId={consentId || undefined}>
      <div className="mx-auto w-full max-w-2xl space-y-5 pt-2 lg:pt-8">
        {loading && <p className="text-[14px] text-slate-500">Loading consent request…</p>}

        {!loading && notFound && (
          <div role="alert" className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-5">
            <h1 className="text-[18px] font-semibold text-rose-900">Consent not found</h1>
            <p className="text-[13px] leading-6 text-rose-800">
              No consent request exists with ID <code className="font-mono font-semibold">{consentId}</code>. Check
              the exact Consent ID shown on the bank&apos;s application page.
            </p>
            <Link
              href="/sme"
              className="inline-flex h-10 items-center rounded-lg bg-[#0f172a] px-4 text-[13px] font-medium text-white hover:bg-[#1e293b] transition-colors"
            >
              Enter a different ID
            </Link>
          </div>
        )}

        {!loading && !notFound && error && !consent && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-800">
            {error}
          </div>
        )}

        {!loading && consent && (
          <>
            {error && (
              <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-800">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[12px] text-emerald-800">
                {message}
              </div>
            )}

            <section>
              <h1 className="text-[20px] font-semibold leading-7 tracking-[-0.025em] text-slate-900 md:text-[26px] md:leading-9">
                {consent.status === 'PENDING' ? 'Data-access request' : 'Consent request'}
              </h1>
              <p className="mt-2 text-[14px] leading-5 text-slate-500 md:text-[15px] md:leading-6">
                Review what the bank is asking for before you decide.
              </p>
            </section>

            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_0_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-slate-400">Consent ID</span>
                  <div className="font-mono text-[15px] font-semibold text-slate-900 break-all">{consent.consent_id}</div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(consent.status)}`}>
                  {consent.status}
                </span>
              </div>

              <hr className="border-slate-100" />

              <dl className="space-y-3 text-[13px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Application</dt>
                  <dd className="font-medium text-slate-900">{consent.application_id}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Purpose</dt>
                  <dd className="font-medium text-slate-900 text-right">{consent.purpose}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Expires</dt>
                  <dd className="font-medium text-slate-900 text-right">{formatExpiry(consent.expires_at)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-1.5">Data requested</dt>
                  <dd>
                    <ul className="flex flex-wrap gap-2">
                      {consent.requested_data.map((item) => (
                        <li
                          key={item}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                        >
                          {formatScope(item)}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>

              {consent.status === 'PENDING' ? (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => decide('reject')}
                    disabled={acting !== null}
                    className="flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-[14px] font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    {acting === 'reject' ? 'Rejecting…' : 'Reject'}
                  </button>
                  <button
                    type="button"
                    onClick={() => decide('approve')}
                    disabled={acting !== null}
                    className="flex h-11 items-center justify-center rounded-lg bg-[#0f172a] text-[14px] font-medium text-white hover:bg-[#1e293b] disabled:bg-slate-400 shadow-sm transition-colors"
                  >
                    {acting === 'approve' ? 'Approving…' : 'Approve'}
                  </button>
                </div>
              ) : (
                <p className="rounded-lg bg-slate-50 p-3 text-[12px] text-slate-600">
                  {consent.status === 'REJECTED'
                    ? 'This request was rejected. No data is being shared.'
                    : 'This request has been approved. No further action is needed.'}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </ConsentShell>
  );
}
