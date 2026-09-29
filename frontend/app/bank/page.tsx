'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Application as BaseApplication, ApplicationCreatePayload, RiskResult } from '@/components/bank/types';

// Augment the imported Application type locally to satisfy TypeScript TS2367 checks.
// This ensures the status field accurately represents all valid backend and frontend string literals.
interface Application extends Omit<BaseApplication, 'status'> {
  status: 'PENDING_CONSENT' | 'PENDING' | 'APPROVED' | 'DATA_READY' | 'REJECTED' | 'FLAGGED';
}

export default function BankDashboardPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState<'all' | 'consent' | 'action'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  
  // Start form fields empty
  const [newBizName, setNewBizName] = useState<string>('');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newPurpose, setNewPurpose] = useState<string>('');
  
  const [creating, setCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Stored risk results, keyed by application_id. Only applications that have
  // completed risk analysis will have an entry here.
  const [riskResults, setRiskResults] = useState<Record<string, RiskResult>>({});
  // Tracks which application_ids currently have an in-flight risk-result fetch,
  // so the row can show a subtle "Loading..." state without hiding the application.
  const [riskLoading, setRiskLoading] = useState<Record<string, boolean>>({});

  // Fetch the STORED risk result for a single application. Never triggers
  // risk analysis (POST /api/risk/analyze/*) — this only reads existing results.
  // A 404 (not yet analyzed) or any network failure is handled gracefully and
  // never surfaces as an error or blocks other applications from loading.
  const fetchRiskResultFor = async (applicationId: string) => {
    setRiskLoading(prev => ({ ...prev, [applicationId]: true }));
    try {
      const res = await fetch(`http://localhost:8000/api/risk/${applicationId}`);
      if (res.ok) {
        const data: RiskResult = await res.json();
        setRiskResults(prev => ({ ...prev, [applicationId]: data }));
      }
      // 404 => not assessed yet; leave riskResults untouched, no error shown.
    } catch (err) {
      // Network/backend error fetching this single risk result — treat as
      // "not assessed" for display purposes and do not break the app list.
      console.error(`Failed to load risk result for ${applicationId}`, err);
    } finally {
      setRiskLoading(prev => ({ ...prev, [applicationId]: false }));
    }
  };

  // Fetch stored risk results for a set of applications in parallel.
  // Intentionally not awaited by callers so the application list itself
  // renders immediately and doesn't wait on risk-result fetches.
  const loadRiskResults = async (apps: Application[]) => {
    await Promise.all(apps.map(app => fetchRiskResultFor(app.application_id)));
  };

  // Fetch live applications from the backend
  const loadApplications = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/applications');
      if (res.ok) {
        const data: Application[] = await res.json();
        // Reverse the array so the most recently created apps appear at the top
        const reversed = data.reverse();
        setApplications(reversed);
        // Refresh stored risk results to match the current application list.
        // Fire-and-forget: applications stay visible while this resolves.
        loadRiskResults(reversed);
      }
    } catch (err) {
      console.error('Failed to load applications from backend', err);
    }
  };

  // Load applications on initial render
  useEffect(() => {
    loadApplications();
  }, []);

  const handleOpenModal = () => {
    setNewBizName('');
    setNewAmount('');
    setNewPurpose('');
    setCreateError(null);
    setShowModal(true);
  };

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      setCreateError(null);
      const payload: ApplicationCreatePayload = {
        business_id: newBizName,
        loan_amount: Number(newAmount),
        purpose: newPurpose,
      };

      const res = await fetch('http://localhost:8000/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json_payload_string(payload),
      });

      if (res.ok) {
        // Refresh the live dashboard list so the new application appears immediately
        await loadApplications();
        setShowModal(false);
      } else {
        const err = await res.json().catch(() => ({}));
        setCreateError(err.detail || 'Failed to create application.');
      }
    } catch {
      setCreateError('Could not reach the backend to create the application. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  function json_payload_string(payload: ApplicationCreatePayload) {
    return JSON.stringify(payload);
  }

  // Filter application items
  const filteredApplications = applications.filter(app => {
    const name = (app.business_name || app.business_id || '').toLowerCase();
    const facility = (app.facility_type || app.purpose || '').toLowerCase();
    const id = (app.application_id || '').toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || facility.includes(searchTerm.toLowerCase()) || id.includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'consent') return app.status === 'PENDING_CONSENT' || app.status === 'PENDING';
    if (filter === 'action') return app.status === 'PENDING_CONSENT' || app.status === 'DATA_READY';
    return true;
  });

  const consentPendingCount = applications.filter(a => a.status === 'PENDING_CONSENT' || a.status === 'PENDING').length;
  const actionRequiredCount = applications.filter(a => a.status === 'PENDING_CONSENT' || a.status === 'DATA_READY').length;

  const buildDetailHref = (app: Application) => {
    const params = new URLSearchParams();
    if (app.business_name) params.set('business_name', app.business_name);
    if (app.loan_amount != null) params.set('loan_amount', String(app.loan_amount));
    if (app.purpose) params.set('purpose', app.purpose);
    if (app.facility_type) params.set('facility_type', app.facility_type);
    if (app.grade) params.set('grade', app.grade);
    const qs = params.toString();
    return `/bank/${app.application_id}${qs ? `?${qs}` : ''}`;
  };

  const navItems: { label: string; active: boolean; path: string }[] = [
    {
      label: 'Underwriting Queue',
      active: true,
      path: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h1.372c.516 0 .966.351 1.091.852l.213.852c.125.501.575.852 1.091.852h3.466c.516 0 .966-.351 1.091-.852l.213-.852c.125-.501.575-.852 1.091-.852H19.5A2.25 2.25 0 0121.75 12v.75m-19.5 0v6a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25v-6m-19.5 0h19.5',
    },
  ];

  return (
    <div className="bg-[#f6f9ff] text-[#161c22] min-h-screen flex flex-col antialiased">
      {/* Top Header Bar */}
      <header className="sticky top-0 w-full z-40 bg-[#f6f9ff]/85 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="h-16 px-4 md:px-8 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#131b2e] text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
              A
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] uppercase tracking-wider font-medium text-[#505f76] leading-none">
                Apex Finance
              </span>
              <h1 className="text-sm md:text-base font-semibold text-[#161c22] truncate leading-tight">
                Underwriter Dashboard
              </h1>
            </div>
          </div>

          {/* Quick Actions & Underwriter Profile */}
          <div className="flex items-center gap-2">
            <Link
              href="/sme"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <span>SME Portal ↗</span>
            </Link>
            <button
              onClick={handleOpenModal}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#131b2e] text-white hover:bg-slate-800 transition-colors shadow-sm"
            >
              + New Loan
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-300 overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-semibold text-slate-700">
              UW
            </div>
          </div>
        </div>
      </header>

      {/* Cockpit Body: Sidebar + Main Content */}
      <div className="flex-1 w-full max-w-[1400px] mx-auto flex items-start gap-6 px-4 md:px-8 py-6">
        {/* Left Sidebar Navigation (desktop only; collapses on tablet/mobile) */}
        <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:shrink-0 sticky top-20 gap-1">
          <span className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-[#505f76]">
            Navigation
          </span>
          {navItems.map(item => (
            <button
              key={item.label}
              type="button"
              disabled={!item.active}
              title={item.active ? undefined : 'Not available in this prototype'}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left ${
                item.active
                  ? 'bg-[#131b2e] text-white shadow-sm'
                  : 'text-[#505f76] cursor-default opacity-70'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px] flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.path} />
              </svg>
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        {/* Main Cockpit Content */}
        <main className="flex-1 min-w-0 space-y-5">
        {/* Title and Live Telemetry Badge */}
        <div className="flex items-start justify-between pt-1 gap-4">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-[#505f76] uppercase tracking-wider">
              Credit Portfolio Oversight
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-[#161c22] tracking-tight">
              Institutional Cockpit
            </h2>
            <p className="text-[13px] md:text-sm text-[#505f76] mt-1.5 max-w-xl">
              Review, analyse and manage SME credit applications across institutional risk facilities
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e8eef6] text-[#45464d] text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Feed
            </span>
          </div>
        </div>

        {/* 4 KPI Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 flex flex-col justify-between shadow-sm border border-slate-200/60">
            <div className="flex items-center justify-between text-[#505f76]">
              <span className="text-xs font-medium">Total Applications</span>
              <span className="text-xs">📄</span>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-bold text-[#161c22] leading-none tracking-tight">
                {applications.length}
              </div>
              <div className="flex items-center gap-1 mt-1.5 text-[#505f76] text-xs font-medium">
                <span>Live backend count</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 flex flex-col justify-between shadow-sm border border-slate-200/60">
            <div className="flex items-center justify-between text-[#505f76]">
              <span className="text-xs font-medium">Consent Pending</span>
              <span className="text-xs">⏱</span>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-bold text-[#161c22] leading-none tracking-tight">
                {consentPendingCount}
              </div>
              <div className="flex items-center gap-1 mt-1.5 text-amber-600 text-xs font-medium">
                <span>Awaiting SME approval</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 flex flex-col justify-between shadow-sm border border-slate-200/60">
            <div className="flex items-center justify-between text-[#505f76]">
              <span className="text-xs font-medium">Applications Requiring Action</span>
              <span className="text-xs">🏛</span>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-bold text-[#161c22] leading-none tracking-tight">
                {actionRequiredCount}
              </div>
              <div className="flex items-center gap-1 mt-1.5 text-rose-600 text-xs font-medium">
                <span>Needs underwriting review</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 flex flex-col justify-between shadow-sm border border-slate-200/60">
            <div className="flex items-center justify-between text-[#505f76]">
              <span className="text-xs font-medium">Current Portfolio</span>
              <span className="text-xs">✓</span>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-bold text-[#161c22] leading-none tracking-tight">
                {applications.length}
              </div>
              <div className="flex items-center gap-1 mt-1.5 text-[#505f76] text-xs font-medium">
                <span>All recorded facilities</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tab Pills */}
        <div className="bg-[#eef4fc] p-1 rounded-lg flex items-center gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all text-center ${
              filter === 'all'
                ? 'bg-white font-semibold text-[#161c22] shadow-sm'
                : 'text-[#505f76] hover:text-[#161c22]'
            }`}
          >
            All Inbound ({applications.length})
          </button>
          <button
            onClick={() => setFilter('consent')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all text-center ${
              filter === 'consent'
                ? 'bg-white font-semibold text-[#161c22] shadow-sm'
                : 'text-[#505f76] hover:text-[#161c22]'
            }`}
          >
            Consent Pending ({consentPendingCount})
          </button>
          <button
            onClick={() => setFilter('action')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all text-center ${
              filter === 'action'
                ? 'bg-white font-semibold text-[#161c22] shadow-sm'
                : 'text-[#505f76] hover:text-[#161c22]'
            }`}
          >
            Action Required ({actionRequiredCount})
          </button>
        </div>

        {/* Recent Credit Facilities Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col scroll-mt-20">
          <div className="p-4 bg-[#eef4fc]/70 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[15px] md:text-base text-[#161c22]">
                  Recent Credit Facilities
                </span>
                <span className="bg-[#e8eef6] px-2 py-0.5 rounded-full text-xs font-medium text-[#45464d]">
                  {filteredApplications.length} total
                </span>
              </div>
              <button
                onClick={loadApplications}
                className="text-xs font-semibold text-[#505f76] hover:text-[#161c22] p-1"
                title="Refresh list"
              >
                ↻ Refresh
              </button>
            </div>
            <div className="relative w-full">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search entity, facility type, or routing ID..."
                className="w-full h-9 pl-9 pr-3 bg-white rounded-lg text-xs text-[#161c22] placeholder:text-slate-400 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Column Header Row (desktop only) */}
          {filteredApplications.length > 0 && (
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-[#eef4fc]/40 border-t border-slate-100 text-[11px] font-medium uppercase tracking-wider text-[#505f76]">
              <span className="flex-1 min-w-0">Application</span>
              <span className="w-32 shrink-0">Status</span>
              <span className="w-36 shrink-0 text-right">Risk Score</span>
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {filteredApplications.map(app => {
              const name = app.business_name || app.business_id || 'SME Business';
              const amount = app.requested_amount || app.loan_amount || 0;
              const facility = app.facility_type || app.purpose || 'Working Capital';

              return (
                <div
                  key={app.application_id}
                  className="p-4 hover:bg-slate-50/70 transition-colors bg-white flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={buildDetailHref(app)}
                          className="font-semibold text-sm text-[#161c22] hover:text-blue-600 transition-colors truncate"
                        >
                          {name}
                        </Link>
                        {(app.status === 'APPROVED' || app.status === 'DATA_READY') && (
                          <span className="text-emerald-600 text-xs">✓</span>
                        )}
                        {(app.status === 'FLAGGED' || app.status === 'REJECTED') && (
                          <span className="text-rose-600 text-xs">⚠</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[13px] text-[#505f76]">
                        <span>{facility}</span>
                        <span>•</span>
                        <span
                          style={{ fontFamily: 'var(--font-geist-mono)' }}
                          className="text-sm font-semibold text-[#161c22]"
                        >
                          ${amount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 flex flex-col items-end">
                      {app.status === 'APPROVED' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          Approved
                        </span>
                      ) : app.status === 'DATA_READY' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          Data Ready
                        </span>
                      ) : app.status === 'REJECTED' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                          Rejected
                        </span>
                      ) : app.status === 'FLAGGED' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                          Flagged
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          Pending Consent
                        </span>
                      )}

                      <div className="mt-1.5 flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider text-[#505f76]">
                            Risk Score
                          </span>
                          {riskResults[app.application_id] ? (
                            <span
                              style={{ fontFamily: 'var(--font-geist-mono)' }}
                              className="text-[13px] font-semibold text-[#161c22]"
                            >
                              {riskResults[app.application_id].overall_score} / 100
                            </span>
                          ) : riskLoading[app.application_id] ? (
                            <span className="text-[13px] font-medium text-slate-400">
                              Loading...
                            </span>
                          ) : (
                            <span className="text-[13px] font-medium text-slate-400">
                              Not assessed
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider text-[#505f76]">
                            Recommended Limit
                          </span>
                          <span
                            style={{ fontFamily: 'var(--font-geist-mono)' }}
                            className="text-xs font-medium text-[#161c22]"
                          >
                            {riskResults[app.application_id]
                              ? `$${riskResults[app.application_id].recommended_credit_limit.toLocaleString()}`
                              : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-1 pt-2 bg-[#eef4fc]/60 px-3 py-1.5 rounded-lg flex items-center justify-between text-xs font-medium text-[#505f76]">
                    <span className="flex items-center gap-1.5 truncate">
                      <span>🔒</span>
                      <span>
                        {app.status === 'APPROVED' || app.status === 'DATA_READY'
                          ? 'Consent approved'
                          : app.status === 'REJECTED'
                          ? 'Application rejected'
                          : app.status === 'FLAGGED'
                          ? 'Review required'
                          : 'Awaiting SME signature authorization'}
                      </span>
                    </span>
                    <Link
                      href={buildDetailHref(app)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex-shrink-0 ml-2"
                    >
                      Review Application →
                    </Link>
                  </div>
                </div>
              );
            })}

            {filteredApplications.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                No credit applications found matching this filter.
              </div>
            )}
          </div>
        </div>

        {/* Demo Environment Status Banner */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/60 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium uppercase tracking-wider text-[#505f76]">
              Demo Environment Status
            </span>
            <span className="text-[#505f76]">Live</span>
          </div>
          <p className="text-[13px] text-[#45464d] leading-relaxed">
            This hackathon prototype uses synthetic financial data and a Mock Account Aggregator for consent-driven SME underwriting.
          </p>
          <div className="flex items-center gap-4 pt-1 flex-wrap text-xs">
            <div className="flex items-center gap-1 text-emerald-700 font-medium">
              <span>📊</span>
              <span>Synthetic Data</span>
            </div>
            <div className="flex items-center gap-1 text-blue-700 font-medium">
              <span>⚙</span>
              <span>Mock AA Engine</span>
            </div>
            <div className="flex items-center gap-1 text-indigo-700 font-medium">
              <span>🧠</span>
              <span>Deterministic Risk Engine</span>
            </div>
          </div>
        </div>
        </main>
      </div>

      {/* New Application Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-[#161c22] text-base">New SME Loan Facility</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateApplication} className="space-y-4">
              {createError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {createError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Business Entity / SME Name
                </label>
                <input
                  type="text"
                  required
                  value={newBizName}
                  onChange={e => setNewBizName(e.target.value)}
                  placeholder="e.g. ABC Traders"
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Requested Loan Amount ($ / ₹)
                </label>
                <input
                  type="number"
                  required
                  min={10000}
                  value={newAmount}
                  onChange={e => setNewAmount(e.target.value)}
                  placeholder="e.g. 800000"
                  style={{ fontFamily: 'var(--font-geist-mono)' }}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Financing Purpose
                </label>
                <input
                  type="text"
                  required
                  value={newPurpose}
                  onChange={e => setNewPurpose(e.target.value)}
                  placeholder="e.g. Working Capital"
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 rounded-lg bg-[#131b2e] text-white text-xs font-semibold hover:bg-slate-800 disabled:bg-slate-400 transition-colors shadow-sm"
                >
                  {creating ? 'Creating...' : 'Create Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}