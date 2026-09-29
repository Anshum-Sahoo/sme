# Architecture — SME Trade Finance Validator

## 1. Purpose

Define the system architecture, technologies, folder structure, roles, and data flow for the hackathon prototype.

The goal is to keep all four developers building compatible parts of one system.

## 2. Architecture Overview

Use one Next.js frontend with two role-based interfaces and one FastAPI backend.

```text
                         Next.js
                     One Frontend
                           |
               +-----------+-----------+
               |                       |
             /bank                    /sme
        Bank Dashboard            SME Consent UI
               |                       |
               +-----------+-----------+
                           |
                      FastAPI
                           |
             +-------------+-------------+
             |             |             |
          Mock AA       Database     Risk Engine
             |                           |
       Synthetic JSON               Score / Flags
```

## 3. Technology Stack

| Layer                      | Technology           |
| -------------------------- | -------------------- |
| Frontend                   | Next.js + TypeScript |
| Styling                    | Tailwind CSS         |
| UI components              | shadcn/ui            |
| Icons                      | Lucide React         |
| Charts                     | Recharts             |
| Backend                    | FastAPI + Python     |
| Validation                 | Pydantic             |
| Database                   | SQLite initially     |
| Analytics                  | Pandas + NumPy       |
| Optional anomaly detection | Scikit-learn         |
| Version control            | Git + GitHub         |

## 4. Frontend

The frontend is a single Next.js application.

Routes:

* `/` — landing page / role selection
* `/bank` — bank dashboard and application workflow
* `/sme` — SME consent portal

The Bank UI and SME UI must not communicate directly. Both call the same FastAPI backend.

## 5. Backend Components

### FastAPI

Responsible for:

* Receiving frontend requests
* Validating request data
* Creating applications
* Managing consent state
* Calling the Mock AA provider
* Calling the Risk Engine
* Returning structured responses

### Mock Account Aggregator

Responsible for simulating an external AA provider.

Functions:

```text
create_consent()
get_consent_status()
approve_consent()
reject_consent()
fetch_financial_data()
```

It provides synthetic data rather than connecting to real financial institutions.

### Database

SQLite stores the shared application and consent state.

The consent record is the source of truth for whether the SME has approved or rejected a request.

### Risk Engine

The Risk Engine analyzes financial data and produces:

* Overall score from 0–100
* Individual financial metrics
* Risk flags
* Explanations
* Recommended credit limit

Risk calculations must be deterministic for the same input data.

## 6. Consent Lifecycle

```text
PENDING
   |
   v
APPROVED
   |
   v
DATA_READY
```

Rejection path:

```text
PENDING
   |
   v
REJECTED
```

The backend owns the consent state. The frontend displays the current state returned by the backend.

## 7. Data Flow

### Step 1 — Application

The bank creates a loan application.

### Step 2 — Consent Request

The backend creates a consent record with status `PENDING`.

### Step 3 — SME Review

The SME sees the requested information, purpose, access type, and expiry.

### Step 4 — Approval or Rejection

The SME's action updates the shared consent record.

### Step 5 — Financial Data

After approval, the backend obtains synthetic financial data through the Mock AA.

### Step 6 — Risk Analysis

The Risk Engine calculates metrics, score, risk flags, and a recommended credit limit.

### Step 7 — Results

The Bank UI displays the financial analysis and explainable risk result.

## 8. Synthetic Data

Store fictional data in:

```text
backend/data/
├── business.json
├── transactions.json
└── gst.json
```

Use approximately 12 months of data for meaningful charts and calculations.

Include one or two mildly unusual transactions so the demo can show risk flags.

Never use real financial credentials or customer data.

## 9. Risk Engine Metrics

Suggested prototype metrics:

1. Cash Flow Stability
2. Revenue Stability
3. Debt Burden / Debt Service Ratio
4. GST Consistency
5. Transaction Anomaly Score

Suggested weights:

| Metric              | Weight |
| ------------------- | -----: |
| Cash Flow Stability |    35% |
| Revenue Stability   |    20% |
| Debt Burden         |    25% |
| GST Consistency     |    10% |
| Transaction Risk    |    10% |

These are prototype weights, not a real banking credit policy.

Do not use an LLM to calculate the actual numerical credit score.

## 10. Repository Structure

```text
sme-trade-finance/
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── bank/
│   │   └── sme/
│   ├── components/
│   └── lib/
├── backend/
│   ├── main.py
│   ├── api/
│   ├── services/
│   │   └── mock_aa.py
│   ├── risk_engine/
│   ├── database/
│   └── data/
├── contracts/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── schemas/
├── README.md
├── AGENTS.md
├── .gitignore
└── .env.example
```

## 11. Integration Principle

Do not let each developer invent a different system.

The shared API and JSON schemas are the agreement that allows the Bank UI, SME UI, backend, Mock AA, and Risk Engine to integrate cleanly.
