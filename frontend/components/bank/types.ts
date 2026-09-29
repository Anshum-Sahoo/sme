/**
 * Shared TypeScript interfaces for the Bank UI.
 * Strictly aligned with:
 *  - contracts/schemas/application.json
 *  - contracts/schemas/consent.json
 *  - contracts/schemas/risk_result.json
 *  - contracts/schemas/financial_data.json
 */

// --- Application Types ---
export interface Application {
  application_id: string;
  business_id?: string;
  business_name?: string;
  loan_amount?: number;
  requested_amount?: number;
  purpose: string;
  status: 'PENDING_CONSENT' | 'PENDING' | 'PROCESSING' | 'APPROVED' | 'COMPLETED' | 'FLAGGED' | 'REJECTED';
  grade?: string;
  facility_type?: string;
  created_at?: string;
}

export interface ApplicationCreatePayload {
  business_id: string;
  loan_amount: number;
  purpose: string;
}

// --- Consent Types ---
export type ConsentStatus = 'PENDING' | 'APPROVED' | 'DATA_READY' | 'REJECTED';

export interface Consent {
  consent_id: string;
  application_id: string;
  status: ConsentStatus;
  requested_data?: string[];
  data_scope?: string[];
  purpose: string;
  expires_at: string;
}

export interface ConsentCreatePayload {
  application_id: string;
  requested_data: string[];
  purpose: string;
}

// --- Risk Result Types ---
export interface RiskMetrics {
  cash_flow_stability: number; // 0-100 (Weight: 35%)
  revenue_stability: number;   // 0-100 (Weight: 20%)
  debt_health: number;         // 0-100 (Weight: 25%)
  gst_consistency: number;     // 0-100 (Weight: 10%)
  transaction_risk: number;    // 0-100 (Weight: 10%)
}

export interface RiskResult {
  application_id: string;
  overall_score: number; // 0-100
  recommended_credit_limit: number;
  metrics: RiskMetrics;
  risk_flags: string[];
  explanation: string[] | string;
}

// --- Financial Data Types ---
export interface BankTransaction {
  transaction_id: string;
  date: string;
  description: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  balance: number;
  category?: string;
}

export interface GSTRecord {
  month: string;
  reported_sales: number;
  gst_paid: number;
  filing_status: string;
}

export interface FinancialData {
  consent_id: string;
  data_source: 'MOCK_AA';
  bank_transactions: BankTransaction[];
  gst_records: GSTRecord[];
}
