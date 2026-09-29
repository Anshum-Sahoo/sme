# API Contract — SME Trade Finance Validator

## 1. Purpose

This document defines the shared backend endpoints and example request/response structures.

All developers must use the same endpoint names and JSON field names.

Do not independently rename fields or change response structures.

Base URL during local development:

```text
http://localhost:8000
```

## 2. Endpoints

| Method | Endpoint                             | Purpose                        |
| ------ | ------------------------------------ | ------------------------------ |
| GET    | `/api/health`                        | Check backend status           |
| POST   | `/api/applications`                  | Create a loan application      |
| POST   | `/api/consents`                      | Create a consent request       |
| GET    | `/api/consents/{consent_id}`         | Get consent status/details     |
| POST   | `/api/consents/{consent_id}/approve` | Approve consent                |
| POST   | `/api/consents/{consent_id}/reject`  | Reject consent                 |
| GET    | `/api/financial-data/{consent_id}`   | Fetch permitted financial data |
| POST   | `/api/risk/analyze/{application_id}` | Run risk analysis              |
| GET    | `/api/risk/{application_id}`         | Retrieve risk result           |

## 3. Health Check

### Request

```http
GET /api/health
```

### Example response

```json
{
  "status": "ok"
}
```

## 4. Create Application

### Request

```http
POST /api/applications
```

### Example request body

```json
{
  "business_id": "SME001",
  "loan_amount": 800000,
  "purpose": "Working Capital"
}
```

### Example response

```json
{
  "application_id": "APP001",
  "business_id": "SME001",
  "loan_amount": 800000,
  "purpose": "Working Capital",
  "status": "PENDING_CONSENT"
}
```

## 5. Create Consent

### Request

```http
POST /api/consents
```

### Example request body

```json
{
  "application_id": "APP001",
  "requested_data": [
    "BANK_TRANSACTIONS_12_MONTHS",
    "GST_RETURNS"
  ],
  "purpose": "Credit Assessment"
}
```

### Example response

```json
{
  "consent_id": "CONS001",
  "application_id": "APP001",
  "status": "PENDING",
  "requested_data": [
    "BANK_TRANSACTIONS_12_MONTHS",
    "GST_RETURNS"
  ],
  "purpose": "Credit Assessment",
  "expires_at": "2026-09-22T20:00:00"
}
```

## 6. Get Consent

### Request

```http
GET /api/consents/{consent_id}
```

Example:

```http
GET /api/consents/CONS001
```

The response should include the consent ID, application ID, status, requested data, purpose, and expiry.

## 7. Approve Consent

### Request

```http
POST /api/consents/{consent_id}/approve
```

Example:

```http
POST /api/consents/CONS001/approve
```

### Example response

```json
{
  "consent_id": "CONS001",
  "status": "APPROVED"
}
```

## 8. Reject Consent

### Request

```http
POST /api/consents/{consent_id}/reject
```

Example:

```http
POST /api/consents/CONS001/reject
```

### Example response

```json
{
  "consent_id": "CONS001",
  "status": "REJECTED"
}
```

## 9. Fetch Financial Data

### Request

```http
GET /api/financial-data/{consent_id}
```

Example:

```http
GET /api/financial-data/CONS001
```

The backend should only return financial data when the consent is approved and the data is available.

The prototype's Mock AA loads synthetic JSON data.

## 10. Run Risk Analysis

### Request

```http
POST /api/risk/analyze/{application_id}
```

Example:

```http
POST /api/risk/analyze/APP001
```

### Example response

```json
{
  "application_id": "APP001",
  "overall_score": 84,
  "recommended_credit_limit": 760000,
  "metrics": {
    "cash_flow_stability": 87,
    "revenue_stability": 84,
    "debt_health": 81,
    "gst_consistency": 92,
    "transaction_risk": 78
  },
  "risk_flags": [
    "Stable cash flow",
    "GST filings consistent",
    "2 unusual transactions detected"
  ],
  "explanation": [
    "Monthly cash flow is relatively stable",
    "GST and bank activity are broadly consistent"
  ]
}
```

## 11. Get Risk Result

### Request

```http
GET /api/risk/{application_id}
```

Example:

```http
GET /api/risk/APP001
```

Return the stored risk result for that application, if analysis has been completed.

## 12. Consent Status Values

Use these shared values:

```text
PENDING
APPROVED
DATA_READY
REJECTED
```

Expected transitions:

```text
PENDING → APPROVED → DATA_READY
PENDING → REJECTED
```

## 13. Shared Rules

1. Endpoint names must remain consistent.
2. JSON field names must remain consistent.
3. Use the same consent status values everywhere.
4. Bank UI and SME UI both communicate with FastAPI.
5. Consent state is stored in the shared backend/database.
6. Financial data is synthetic.
7. Risk calculations are deterministic.
8. The example score and credit limit are placeholders for the demo, not actual credit decisions.

## 14. Schema Files

The following schemas should be stored under `contracts/schemas/`:

```text
application.json
consent.json
financial_data.json
risk_result.json
```

These should match the request and response structures defined in this document.
