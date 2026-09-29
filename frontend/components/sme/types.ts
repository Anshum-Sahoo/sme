/**
 * Consent record — matches contracts/schemas/consent.json exactly.
 *
 * Runtime note: GET /api/consents/{id} currently returns `requested_data`
 * instead of `data_scope`. Use `normalizeConsent()` to map the live payload
 * onto this schema without renaming the API contract.
 */
export type ConsentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DATA_READY';

export interface Consent {
  consent_id?: string;
  application_id: string;
  status?: ConsentStatus;
  data_scope: string[];
  purpose: string;
  expires_at: string; // date-time
}

export interface ConsentActionResponse {
  consent_id: string;
  status: ConsentStatus;
}

/** Raw GET /api/consents/{id} payload (API.md + live FastAPI). */
export interface ConsentApiPayload {
  consent_id?: string;
  application_id: string;
  status?: ConsentStatus;
  data_scope?: string[];
  requested_data?: string[];
  purpose: string;
  expires_at: string;
}

export function normalizeConsent(raw: ConsentApiPayload): Consent {
  return {
    consent_id: raw.consent_id,
    application_id: raw.application_id,
    status: raw.status,
    data_scope: raw.data_scope ?? raw.requested_data ?? [],
    purpose: raw.purpose,
    expires_at: raw.expires_at,
  };
}

export const API_BASE = 'http://localhost:8000';
