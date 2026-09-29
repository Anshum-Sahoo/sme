'use client';

import React, { useState, useEffect } from 'react';
import { RiskResult, ConsentStatus } from './types';

interface RiskDashboardProps {
  applicationId: string;
  consentId?: string | null;
  consentStatus?: ConsentStatus | null;
  onRefreshConsent?: () => void;
}

export default function RiskDashboard({
  applicationId,
  consentId,
  consentStatus,
  onRefreshConsent,
}: RiskDashboardProps) {
  const [riskResult, setRiskResult] = useState<RiskResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRiskResult = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`http://localhost:8000/api/risk/${applicationId}`);
      if (res.ok) {
        const data: RiskResult = await res.json();
        setRiskResult(data);
      } else if (res.status === 404) {
        // Not analyzed yet
        setRiskResult(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || 'Failed to fetch risk assessment.');
      }
    } catch {
      setError('Cannot connect to backend server at http://localhost:8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) {
      fetchRiskResult();
    }
  }, [applicationId]);

  const handleRunAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      const res = await fetch(`http://localhost:8000/api/risk/analyze/${applicationId}`, {
        method: 'POST',
      });

      if (res.ok) {
        const data: RiskResult = await res.json();
        setRiskResult(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || 'Risk analysis failed. Please try again.');
      }
    } catch {
      setError('Network error while requesting risk analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Score tier color helpers
  const getScoreTheme = (score: number) => {
    if (score >= 75) {
      return {
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        ringColor: 'text-emerald-600',
        label: 'Low Risk • Prime Underwrite',
      };
    }
    if (score >= 55) {
      return {
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
        ringColor: 'text-amber-500',
        label: 'Moderate Risk • Standard Underwrite',
      };
    }
    return {
      badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
      ringColor: 'text-rose-600',
      label: 'High Risk • Enhanced Diligence',
    };
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-wider">
            RE
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm md:text-base">
              Autonomous Risk Assessment Engine
            </h3>
            <p className="text-xs text-slate-500">
              Deterministic Underwriting & Telemetry Scoring (0–100)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
            Demo Mode
          </span>
          <button
            onClick={fetchRiskResult}
            disabled={loading}
            className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-200/60 transition-colors"
            title="Refresh Analysis"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 space-y-6">
        {/* Error notification */}
        {error && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <span className="font-bold">Notice:</span>
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* State: Awaiting SME Approval */}
        {consentStatus === 'PENDING' && !riskResult && (
          <div className="p-6 rounded-xl bg-blue-50/60 border border-blue-200 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-blue-100 text-blue-700">
              <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-semibold text-slate-900 text-base">Awaiting SME Consent Approval</h4>
            <p className="text-xs md:text-sm text-slate-600 max-w-md mx-auto">
              Consent request is currently <span className="font-semibold text-blue-700">PENDING</span>.
              Financial transactions and GST records will be transmitted via Mock AA once the SME confirms authorization.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              {consentId ? (
                <a
                  href={`/sme/${consentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Open SME Portal ↗
                </a>
              ) : (
                <span
                  title="Consent ID unavailable"
                  className="px-4 py-2 bg-slate-200 text-slate-400 text-xs font-semibold rounded-lg cursor-not-allowed"
                >
                  Open SME Portal ↗
                </span>
              )}
              {onRefreshConsent && (
                <button
                  onClick={onRefreshConsent}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Check Status
                </button>
              )}
            </div>
          </div>
        )}

        {/* State: Ready to Analyze */}
        {(consentStatus === 'APPROVED' || consentStatus === 'DATA_READY') && !riskResult && !loading && (
          <div className="p-6 rounded-xl bg-emerald-50/60 border border-emerald-200 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-700">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-semibold text-slate-900 text-base">Financial Telemetry Verified & Ready</h4>
            <p className="text-xs md:text-sm text-slate-600 max-w-md mx-auto">
              SME has granted data access. 12 months of synthetic bank statement transactions and GST returns are accessible for automated underwriting.
            </p>
            <div className="pt-2">
              <button
                onClick={handleRunAnalysis}
                disabled={analyzing}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs md:text-sm font-semibold rounded-lg shadow-sm transition-all"
              >
                {analyzing ? 'Computing Deterministic Score...' : '⚡ Run Risk Analysis'}
              </button>
            </div>
          </div>
        )}

        {/* State: Analysis Loading */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-500">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
            <span className="text-xs">Loading underwriting model...</span>
          </div>
        )}

        {/* State: Risk Result Display */}
        {riskResult && (
          <div className="space-y-6">
            {/* Top Score & Recommended Limit Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Overall Score Dial */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center text-center">
                <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  Overall Credit Score
                </span>
                <div className="my-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                    {riskResult.overall_score}
                  </span>
                  <span className="text-slate-400 text-lg font-medium">/100</span>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    getScoreTheme(riskResult.overall_score).badgeBg
                  }`}
                >
                  {getScoreTheme(riskResult.overall_score).label}
                </span>
              </div>

              {/* Recommended Credit Limit */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                    Recommended Credit Limit
                  </span>
                  <div className="mt-2 text-2xl md:text-3xl font-bold text-slate-900">
                    ${riskResult.recommended_credit_limit.toLocaleString()}
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Formula bounded to requested facility
                </div>
              </div>

              {/* Anomaly / Flag Summary */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                    Telemetry Flags
                  </span>
                  <div className="mt-2 text-2xl md:text-3xl font-bold text-slate-900">
                    {riskResult.risk_flags?.length || 0}
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Automated checks completed
                </div>
              </div>
            </div>

            {/* Five Weighted Metrics Grid */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Deterministic Metric Breakdown (0–100)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* 1. Cash Flow */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/60">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-700 truncate">Cash Flow</span>
                    <span className="text-[10px] text-slate-400">35%</span>
                  </div>
                  <div className="mt-2 text-xl font-bold text-slate-900">
                    {riskResult.metrics.cash_flow_stability}
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-slate-900 h-full rounded-full transition-all"
                      style={{ width: `${riskResult.metrics.cash_flow_stability}%` }}
                    />
                  </div>
                </div>

                {/* 2. Revenue */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/60">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-700 truncate">Revenue</span>
                    <span className="text-[10px] text-slate-400">20%</span>
                  </div>
                  <div className="mt-2 text-xl font-bold text-slate-900">
                    {riskResult.metrics.revenue_stability}
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-slate-900 h-full rounded-full transition-all"
                      style={{ width: `${riskResult.metrics.revenue_stability}%` }}
                    />
                  </div>
                </div>

                {/* 3. Debt Health */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/60">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-700 truncate">Debt Health</span>
                    <span className="text-[10px] text-slate-400">25%</span>
                  </div>
                  <div className="mt-2 text-xl font-bold text-slate-900">
                    {riskResult.metrics.debt_health}
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-slate-900 h-full rounded-full transition-all"
                      style={{ width: `${riskResult.metrics.debt_health}%` }}
                    />
                  </div>
                </div>

                {/* 4. GST Consistency */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/60">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-700 truncate">GST Reconcile</span>
                    <span className="text-[10px] text-slate-400">10%</span>
                  </div>
                  <div className="mt-2 text-xl font-bold text-slate-900">
                    {riskResult.metrics.gst_consistency}
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-slate-900 h-full rounded-full transition-all"
                      style={{ width: `${riskResult.metrics.gst_consistency}%` }}
                    />
                  </div>
                </div>

                {/* 5. Transaction Risk */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/60">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-700 truncate">Txn Anomaly</span>
                    <span className="text-[10px] text-slate-400">10%</span>
                  </div>
                  <div className="mt-2 text-xl font-bold text-slate-900">
                    {riskResult.metrics.transaction_risk}
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-slate-900 h-full rounded-full transition-all"
                      style={{ width: `${riskResult.metrics.transaction_risk}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Flags & Underwriting Explanations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Flags */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Risk & Anomaly Flags
                </h4>
                <ul className="space-y-1.5">
                  {riskResult.risk_flags && riskResult.risk_flags.length > 0 ? (
                    riskResult.risk_flags.map((flag, idx) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5">⚠</span>
                        <span>{flag}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-slate-500 italic">No adverse risk flags detected.</li>
                  )}
                </ul>
              </div>

              {/* Explanation notes */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Underwriter Explanations
                </h4>
                <ul className="space-y-1.5">
                  {Array.isArray(riskResult.explanation) ? (
                    riskResult.explanation.map((exp, idx) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                        <span className="text-emerald-600 mt-0.5">✔</span>
                        <span>{exp}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-slate-700 flex items-start gap-1.5">
                      <span className="text-emerald-600 mt-0.5">✔</span>
                      <span>{riskResult.explanation}</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Prototype Disclaimer */}
            <p className="text-[11px] text-slate-400 text-center italic">
              Demonstration prototype: Underwriting scores and credit limits are illustrative mathematical models and do not constitute real lending decisions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
