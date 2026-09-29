'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Application, Consent, ConsentCreatePayload } from '@/components/bank/types';
import RiskDashboard from '@/components/bank/RiskDashboard';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface PageProps {
  params: { application_id: string };
}

export default function ApplicationDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={null}>
      <ApplicationDetailContent params={params} />
    </Suspense>
  );
}

function ApplicationDetailContent({ params }: PageProps) {
  const applicationId = params.application_id;

  const [application, setApplication] = useState<Application | null>(null);
  const [consent, setConsent] = useState<Consent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [requestingConsent, setRequestingConsent] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch the application details
      const res = await fetch(`${API_BASE}/api/applications`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to fetch applications.');
      }

      const data: Application[] = await res.json();
      const found = data.find((app) => app.application_id === applicationId);

      if (found) {
        setApplication(found);
      } else {
        setError('Application not found.');
        return; // Stop loading if the application doesn't exist
      }

      // 2. Fetch the consent for this specific application
      const consentRes = await fetch(
        `${API_BASE}/api/consents/application/${encodeURIComponent(applicationId)}`,
        { cache: 'no-store' }
      );
      if (consentRes.ok) {
        const consentData: Consent = await consentRes.json();
        setConsent(consentData);
      } else if (consentRes.status === 404) {
        // Normal behavior: consent has simply not been requested yet
        setConsent(null);
      } else {
        // Do NOT silently show "NOT REQUESTED" here - that would invite duplicate requests.
        setError('Could not load consent status for this application. Please retry.');
      }
    } catch (e: any) {
      setError('Could not connect to the backend to load application record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  // Re-read the consent from the backend by its exact consent_id.
  // announce=true shows a message/error; announce=false is a silent background sync.
  const refreshConsent = async (announce: boolean, idOverride?: string): Promise<Consent | null> => {
    const id = idOverride ?? consent?.consent_id;
    if (!id) return null;
    try {
      const res = await fetch(`${API_BASE}/api/consents/${encodeURIComponent(id)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const updated: Consent = await res.json();
        setConsent(updated);
        if (announce) {
          setError(null);
          setStatusMessage(`Consent status updated: ${updated.status}`);
        }
        return updated;
      }
      if (announce) {
        setError(
          res.status === 404
            ? `Consent ${id} no longer exists on the backend.`
            : 'Failed to refresh consent status.'
        );
      }
    } catch {
      if (announce) setError('Could not reach the backend to refresh consent status.');
    }
    return null;
  };

  // Request Financial Data Consent via POST /api/consents
  const handleRequestConsent = async () => {
    try {
      setRequestingConsent(true);
      setError(null);
      setStatusMessage(null);

      const payload: ConsentCreatePayload = {
        application_id: applicationId,
        requested_data: ['BANK_TRANSACTIONS_12_MONTHS', 'GST_RETURNS'],
        purpose: 'Credit Assessment',
      };

      const res = await fetch(`${API_BASE}/api/consents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'Failed to initiate consent request.');
        return;
      }

      // The backend-issued consent_id is the only ID we use.
      const created: Consent = await res.json();
      setConsent(created);

      // Refresh from the backend so the UI reflects the stored record.
      const confirmed = await refreshConsent(false, created.consent_id);
      const finalConsent = confirmed ?? created;
      setStatusMessage(
        `Consent request created with status ${finalConsent.status}. ` +
          `Enter Consent ID ${finalConsent.consent_id} in the SME portal.`
      );
    } catch {
      setError('Could not reach the backend to create a consent request. Please try again.');
    } finally {
      setRequestingConsent(false);
    }
  };

  const handleRefreshConsent = async (): Promise<void> => {
    await refreshConsent(true);
  };

  // While the consent is PENDING, keep in sync with the SME portal's decision.
  useEffect(() => {
    if (!consent || consent.status !== 'PENDING') return;
    const interval = setInterval(() => {
      refreshConsent(false);
    }, 5000);
    const onFocus = () => {
      refreshConsent(false);
    };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consent?.consent_id, consent?.status]);

  const handleCopyConsentId = async () => {
    if (!consent) return;
    try {
      await navigator.clipboard.writeText(consent.consent_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; the ID is still visible for manual copy
    }
  };

  // Strict backend source of truth overrides
  const businessName = application?.business_id || null;
  const requestedAmount = application?.loan_amount ?? null;
  const purpose = application?.purpose || null;
  const facilityType = application?.facility_type || null;
  const grade = application?.grade || null;

  return (
    <div className="bg-[#f6f9ff] text-[#161c22] min-h-screen flex flex-col font-sans antialiased">
      {/* Top Header Bar matching Stitch */}
      <header className="sticky top-0 w-full z-40 bg-[#f6f9ff]/85 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="h-16 px-4 md:px-8 max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/bank"
              className="text-xs font-semibold text-[#505f76] hover:text-[#161c22] flex items-center gap-1 transition-colors"
            >
              ← Cockpit
            </Link>
            <div className="h-4 w-px bg-slate-300" />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#505f76] leading-none">
                Facility Underwriting
              </span>
              <h1 className="text-sm md:text-base font-bold text-[#161c22] truncate leading-tight">
                {applicationId}
                {businessName ? ` • ${businessName}` : ''}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {consent ? (
              <Link
                href={`/sme/${encodeURIComponent(consent.consent_id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1"
              >
                <span>Simulate SME Portal</span>
                <span>↗</span>
              </Link>
            ) : (
              <span
                title="Request consent first"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 text-slate-400 cursor-not-allowed flex items-center gap-1"
              >
                <span>Simulate SME Portal</span>
                <span>↗</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Notifications & Error alerts */}
        {error && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {error}
          </div>
        )}
        {statusMessage && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            {statusMessage}
          </div>
        )}

        {/* Facility Information Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 md:p-6 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <span className="text-xs uppercase font-semibold text-[#505f76] tracking-wider">
                SME Credit Facility Application
              </span>
              <h2 className="text-2xl font-bold text-[#161c22] mt-1">{businessName ?? 'Application details unavailable'}</h2>
              <div className="flex items-center gap-3 mt-1 text-xs text-[#505f76] flex-wrap">
                <span>Facility ID: <strong className="text-slate-800">{applicationId}</strong></span>
                <span>•</span>
                <span>Purpose: <strong className="text-slate-800">{purpose ?? 'Not available'}</strong></span>
                <span>•</span>
                <span>Facility Type: <strong className="text-slate-800">{facilityType ?? 'Not available'}</strong></span>
                <span>•</span>
                <span>Grade: <strong className="text-slate-800">{grade ?? 'Not available'}</strong></span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs uppercase font-semibold text-[#505f76] tracking-wider">
                Requested Amount
              </span>
              <div className="text-2xl md:text-3xl font-extrabold text-[#161c22] mt-0.5">
                {requestedAmount != null ? `$${requestedAmount.toLocaleString()}` : 'Not available'}
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Consent Status & Workflow Stepper */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-[#505f76]">Consent Lifecycle:</span>
              {consent ? (
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                    consent.status === 'APPROVED' || consent.status === 'DATA_READY'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : consent.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-blue-100 text-blue-800 border border-blue-300'
                  }`}
                >
                  {consent.status}
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300">
                  {loading ? 'LOADING…' : 'NOT REQUESTED'}
                </span>
              )}

              {consent && (
                <span className="text-xs text-[#505f76]">
                  ID: <code className="font-mono text-slate-800">{consent.consent_id}</code>
                </span>
              )}
            </div>

            {/* Action Trigger Buttons */}
            <div className="flex items-center gap-2">
              {!consent ? (
                <button
                  onClick={handleRequestConsent}
                  disabled={requestingConsent || loading || !application}
                  className="px-4 py-2 bg-[#131b2e] hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  {requestingConsent ? 'Initiating Request...' : 'Request Financial Consent'}
                </button>
              ) : (
                <button
                  onClick={handleRefreshConsent}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-300"
                >
                  Sync Consent Status
                </button>
              )}
            </div>
          </div>

          {/* Consent ID callout: the exact ID to enter in the SME portal */}
          {consent && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] uppercase font-semibold tracking-wider text-blue-800">
                  Consent ID for the SME portal
                </span>
                <div className="mt-0.5 font-mono text-base font-bold text-slate-900 break-all">
                  {consent.consent_id}
                </div>
                <p className="text-xs text-[#505f76] mt-1">
                  Enter this exact ID at <code className="font-mono">/sme</code>, or use “Simulate SME Portal”.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyConsentId}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-300 shrink-0"
              >
                {copied ? 'Copied' : 'Copy ID'}
              </button>
            </div>
          )}
        </div>

        {/* Risk Assessment Engine Dashboard */}
        <RiskDashboard
          applicationId={applicationId}
          consentId={consent?.consent_id}
          consentStatus={consent?.status}
          onRefreshConsent={handleRefreshConsent}
        />
      </main>
    </div>
  );
}
