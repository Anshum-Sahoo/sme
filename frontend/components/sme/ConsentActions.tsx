'use client';

import React, { useState } from 'react';
import { API_BASE, ConsentStatus } from './types';
import { LockSmallWhite, XIcon } from './icons';

interface ConsentActionsProps {
  consentId: string;
  status?: ConsentStatus;
  onResolved?: (status: Extract<ConsentStatus, 'APPROVED' | 'REJECTED'>) => void;
}

export default function ConsentActions({ consentId, status, onResolved }: ConsentActionsProps) {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Extract<ConsentStatus, 'APPROVED' | 'REJECTED'> | null>(
    status === 'APPROVED' || status === 'REJECTED' ? status : null
  );

  const locked = resolved !== null || status === 'DATA_READY';

  async function submit(action: 'approve' | 'reject') {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/consents/${encodeURIComponent(consentId)}/${action}`, {
        method: 'POST',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = typeof body.detail === 'string' ? body.detail : `Unable to ${action} this consent.`;
        throw new Error(detail);
      }
      const next = action === 'approve' ? 'APPROVED' : 'REJECTED';
      setResolved(next);
      onResolved?.(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Is the backend running on port 8000?');
    } finally {
      setBusy(null);
    }
  }

  if (status === 'DATA_READY') {
    return (
      <StatusBanner tone="success">
        Consent approved and data is ready. You may return to the bank window.
      </StatusBanner>
    );
  }

  if (locked && (resolved === 'APPROVED' || status === 'APPROVED')) {
    return (
      <StatusBanner tone="success">
        Consent Approved. You may return to the bank window.
      </StatusBanner>
    );
  }

  if (locked && (resolved === 'REJECTED' || status === 'REJECTED')) {
    return (
      <StatusBanner tone="danger">
        Consent Rejected. No financial data will be shared. You may return to the bank window.
      </StatusBanner>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => submit('approve')}
        disabled={busy !== null}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0f172a] text-[15px] font-medium text-white transition-colors hover:bg-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#0f172a] focus:ring-offset-2 disabled:opacity-60"
      >
        <LockSmallWhite />
        {busy === 'approve' ? 'Approving…' : 'Approve Consent'}
      </button>
      <button
        type="button"
        onClick={() => submit('reject')}
        disabled={busy !== null}
        className="flex h-10 w-full items-center justify-center gap-1.5 text-[14px] font-medium text-slate-500 transition-colors hover:text-rose-700 disabled:opacity-60"
      >
        <XIcon />
        {busy === 'reject' ? 'Rejecting…' : 'Reject Request'}
      </button>
    </div>
  );
}

function StatusBanner({
  tone,
  children,
}: {
  tone: 'success' | 'danger';
  children: React.ReactNode;
}) {
  const cls =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-rose-200 bg-rose-50 text-rose-800';
  return (
    <div className={`rounded-xl border px-4 py-3 text-[14px] font-medium leading-5 ${cls}`}>
      {children}
    </div>
  );
}
