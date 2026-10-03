# CredFlow — Consent-First SME Underwriting Platform

> A full-stack prototype that demonstrates a consent-driven workflow for analyzing synthetic SME bank and GST data and producing an explainable preliminary credit assessment.

[![Frontend](https://img.shields.io/badge/Frontend-Next.js-black)](https://nextjs.org/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688)](https://fastapi.tiangolo.com/)
[![Language](https://img.shields.io/badge/Backend%20Language-Python-3776AB)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/Frontend%20Language-TypeScript-3178C6)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Project%20Demo-lightgrey)](#license)

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. The Problem](#2-the-problem)
- [3. The Solution](#3-the-solution)
- [4. Who Uses the System](#4-who-uses-the-system)
- [5. End-to-End Workflow](#5-end-to-end-workflow)
- [6. Consent Lifecycle](#6-consent-lifecycle)
- [7. What Data the System Uses](#7-what-data-the-system-uses)
- [8. Risk Assessment Engine](#8-risk-assessment-engine)
- [9. Risk Scoring — Step by Step](#9-risk-scoring--step-by-step)
- [10. Multiple Synthetic SME Profiles](#10-multiple-synthetic-sme-profiles)
- [11. Technology Stack](#11-technology-stack)
- [12. System Architecture](#12-system-architecture)
- [13. Project Structure](#13-project-structure)
- [14. Backend API](#14-backend-api)
- [15. Running the Project Locally](#15-running-the-project-locally)
- [16. Running the Tests](#16-running-the-tests)
- [17. Using the Demo](#17-using-the-demo)
- [18. Local Environment Configuration](#18-local-environment-configuration)
- [19. Deployment](#19-deployment)
- [20. Troubleshooting](#20-troubleshooting)
- [21. Limitations](#21-limitations)
- [22. Security and Data Disclaimer](#22-security-and-data-disclaimer)
- [23. Future Improvements](#23-future-improvements)
- [24. Why the Prototype Uses Deterministic Logic](#24-why-the-prototype-uses-deterministic-logic)
- [25. Demo URLs](#25-demo-urls)
- [26. GitHub Setup](#26-github-setup)
- [27. License](#27-license)

---

# 1. Project Overview

**CredFlow** is a consent-first SME underwriting prototype built to demonstrate how a financial institution could move from a loan application to a structured preliminary credit assessment through one workflow.

The prototype connects five major ideas:

1. **Loan application creation** by a bank/underwriter.
2. **Explicit financial-data consent** from the SME.
3. **Financial-data retrieval** after consent through a Mock Account Aggregator.
4. **Deterministic financial analysis** across bank and GST signals.
5. **Explainable underwriting output** for the bank/underwriter.

The resulting assessment contains:

- An overall score from **0–100**.
- Five underlying financial metrics.
- Risk flags.
- Human-readable explanations.
- A preliminary recommended credit limit.

### Important project status

This repository contains a **prototype/demo**, not a production banking platform.

The project deliberately uses:

- Synthetic financial records.
- A Mock Account Aggregator instead of a live provider.
- An in-memory backend data store.
- A deterministic/rule-based risk engine.

The output is intended to support a demo and illustrate the workflow. It is **not a real lending decision, credit approval, or production credit policy**.

---

# 2. The Problem

An SME credit application can require an underwriter to understand several financial signals at the same time.

Examples include:

- Whether cash inflows and outflows are stable.
- Whether sales/revenue are reasonably consistent.
- Whether debits place pressure on the business's cash position.
- Whether GST records are consistent with bank-side sales signals.
- Whether unusual transactions appear in the available history.

The challenge addressed by this prototype is therefore not simply **"calculate a score"**.

It is:

> **How can authorized financial data be turned into a structured, explainable preliminary assessment that an underwriter can review in one workflow?**

The prototype focuses on bringing consent, financial data, analysis, and explanation together rather than showing these as disconnected steps.

---

# 3. The Solution

CredFlow follows a simple principle:

> **Consent first → Data retrieval → Analysis → Explainable assessment**

A bank creates an application and requests specific financial data. The SME reviews the request and explicitly approves or rejects it. Only after approval does the backend retrieve the synthetic financial records from the Mock Account Aggregator.

The risk engine then processes the authorized data and returns a structured result.

### Core output

```text
Financial Data
     ↓
Risk Metrics
     ↓
Overall Score
     ↓
Risk Flags
     ↓
Human-readable Explanation
     ↓
Preliminary Recommended Credit Limit
```

The same engine can be run on multiple synthetic SME profiles so the demo can show how different financial evidence produces different assessment outputs.

---

# 4. Who Uses the System

The prototype has two user-facing roles.

## 4.1 Bank / Underwriter

The Bank interface is used to:

- View applications.
- Create a new SME loan application.
- Select the synthetic SME profile.
- Enter the requested loan amount.
- Enter the purpose of the financing.
- Create a consent request.
- View the current consent status.
- Retrieve the authorized financial data.
- Run the risk assessment.
- Review the final assessment.

### Bank result view

The risk dashboard can show:

- Overall score.
- Cash-flow metric.
- Revenue metric.
- Debt-health proxy.
- GST consistency metric.
- Transaction-risk metric.
- Risk flags.
- Explanations.
- Preliminary recommended credit limit.

## 4.2 SME

The SME interface is used to:

- Open a consent request.
- Review the associated application.
- See the requested data categories.
- See the stated purpose.
- See the consent expiry.
- Approve the request.
- Reject the request.

The SME action changes the shared consent state stored by the backend.

---

# 5. End-to-End Workflow

The complete workflow is:

```text
┌────────────────────────┐
│ 1. Bank creates        │
│    SME application     │
└──────────┬─────────────┘
           ↓
┌────────────────────────┐
│ 2. Bank creates        │
│    consent request     │
└──────────┬─────────────┘
           ↓
┌────────────────────────┐
│ 3. SME reviews request │
└──────────┬─────────────┘
           ↓
      ┌────┴────┐
      │         │
   APPROVE    REJECT
      │         │
      ↓         ↓
┌───────────┐  ┌──────────┐
│ 4. Fetch  │  │ REJECTED │
│ financial │  └──────────┘
│ data      │
└─────┬─────┘
      ↓
┌────────────────────────┐
│ 5. Risk Engine         │
│    analyzes data       │
└──────────┬─────────────┘
           ↓
┌────────────────────────┐
│ 6. Bank reviews        │
│    explainable result  │
└────────────────────────┘
```

## Step 1 — Application creation

The bank creates an application containing:

- `business_id`
- `loan_amount`
- `purpose`

The backend generates an application ID such as:

```text
APP001
```

The initial application status is:

```text
PENDING_CONSENT
```

## Step 2 — Consent request

The bank requests access to specific financial information.

The backend creates a consent record and generates an ID such as:

```text
CONS001
```

The consent starts in:

```text
PENDING
```

The prototype also assigns a 24-hour expiry timestamp when the consent is created.

## Step 3 — SME review

The SME portal reads the consent information from the backend.

The SME can see:

- Application ID.
- Loan request.
- Purpose.
- Requested data.
- Consent ID.
- Expiry timestamp.

## Step 4 — Approve or reject

The SME chooses one of two paths.

### Approval

```text
PENDING → APPROVED
```

The associated application status is synchronized to `APPROVED`.

### Rejection

```text
PENDING → REJECTED
```

The associated application status is synchronized to `REJECTED`.

Financial data cannot be fetched while the consent is pending or rejected.

## Step 5 — Fetch financial data

Once the consent is approved, the backend requests the synthetic records from the Mock Account Aggregator.

The consent then transitions to:

```text
APPROVED → DATA_READY
```

The related application is also moved to:

```text
DATA_READY
```

## Step 6 — Risk analysis

The backend passes the retrieved data to the deterministic risk engine.

The engine returns:

- Overall score.
- Five metric scores.
- Risk flags.
- Explanations.
- Preliminary recommended credit limit.

## Step 7 — Underwriter review

The Bank risk dashboard displays the result in one place.

The result is designed to be **explainable**, so the dashboard contains both numbers and text explaining the evidence used by the prototype.

---

# 6. Consent Lifecycle

The consent lifecycle is explicitly controlled by the backend.

```text
              ┌───────────┐
              │  PENDING  │
              └─────┬─────┘
                    │
          ┌─────────┴─────────┐
          │                   │
       APPROVE              REJECT
          │                   │
          ↓                   ↓
    ┌───────────┐       ┌───────────┐
    │ APPROVED  │       │ REJECTED  │
    └─────┬─────┘       └───────────┘
          │
          ↓
    ┌───────────┐
    │ DATA_READY│
    └───────────┘
```

### Why the backend owns this state

Both the Bank UI and SME UI communicate with the same FastAPI backend.

The frontend does not create an independent version of consent state.

This means:

```text
Bank UI ───────┐
               │
               ▼
          FastAPI Backend
               ▲
               │
SME UI ────────┘
```

The backend is the shared source of truth for the prototype's application and consent state.

---

# 7. What Data the System Uses

The prototype uses **fictional/synthetic data only**.

There are two main data types.

## 7.1 Bank transaction data

Each transaction contains fields such as:

```json
{
  "transaction_id": "TXN001",
  "date": "2025-09-05",
  "description": "Customer Payment",
  "amount": 85000,
  "type": "CREDIT",
  "balance": 420000,
  "category": "SALES"
}
```

The risk engine uses these records to derive monthly cash-flow, sales/revenue, debit-burden, and transaction-risk signals.

## 7.2 GST data

Each monthly GST record contains:

```json
{
  "month": "2025-09",
  "reported_sales": 500000,
  "gst_paid": 90000,
  "filing_status": "FILED"
}
```

The engine uses GST information to assess filing consistency and compare reported sales with the bank-side sales signal.

## 7.3 Current dataset size

The repository currently contains:

| Profile | Bank transactions | GST records |
|---|---:|---:|
| SME001 | 48 | 12 |
| SME002 | 96 | 12 |
| SME003 | 115 | 12 |

The data covers a synthetic multi-month history and is used purely for demonstration.

---

# 8. Risk Assessment Engine

The numerical assessment is intentionally **deterministic**.

For the same financial input and requested amount, the engine returns the same result.

The prototype uses five weighted components:

| Metric | Weight |
|---|---:|
| Cash Flow Stability | 35% |
| Revenue Stability | 20% |
| Debt Health Proxy | 25% |
| GST Consistency | 10% |
| Transaction Risk | 10% |
| **Total** | **100%** |

The score is normalized to a 0–100 scale.

The risk engine does not ask an LLM to generate the numerical score.

---

# 9. Risk Scoring — Step by Step

This section explains what the current prototype actually calculates.

## 9.1 Cash Flow Stability — 35%

The engine groups transactions by month and calculates:

```text
Monthly Net Cash Flow
= Monthly Credits − Monthly Debits
```

It then looks at the variation in monthly net cash flow.

The prototype uses the population standard deviation relative to the mean (coefficient of variation) as a stability signal.

Negative months also reduce the score.

Conceptually:

```text
More stable positive monthly cash flow
            ↓
       Higher score

High variation / negative months
            ↓
        Lower score
```

## 9.2 Revenue Stability — 20%

The engine identifies bank transactions that are:

```text
Type = CREDIT
Category = SALES
```

Sales are aggregated by month.

The variation of monthly sales is used to produce a stability score.

Conceptually:

```text
Consistent monthly sales
        ↓
Higher revenue score

Large month-to-month variation
        ↓
Lower revenue score
```

## 9.3 Debt Health Proxy — 25%

This is important:

> **The prototype does not have a real debt schedule.**

Instead, it uses a synthetic debit-burden proxy derived from total transaction credits and debits.

```text
Debit Ratio
= Total Debits / Total Credits
```

In the current rules:

- A debit ratio at or below `0.50` maps to a score of `100`.
- A debit ratio at or above `1.50` maps to a score of `0`.
- Values between those thresholds are interpolated.

This should be understood as a **demo proxy**, not a real-world debt-service calculation.

## 9.4 GST Consistency — 10%

The engine combines two signals:

### Filing consistency

It measures the percentage of GST records marked:

```text
FILED
```

### Bank-vs-GST sales consistency

For overlapping months, the engine compares:

```text
Bank sales
        vs.
GST reported sales
```

If the difference is greater than 20% for a month, a GST mismatch flag is raised.

The final GST score uses:

```text
70% Filing Score
+
30% Revenue Consistency Score
```

## 9.5 Transaction Risk — 10%

The prototype looks for deterministic transaction-risk signals.

A transaction can be flagged when it has one or more of these characteristics:

- Category is `UNKNOWN`.
- Description contains `crypto`.
- Description contains `unregistered`.
- Description contains `uninvoiced`.
- The transaction is unusually large relative to the dataset median.

The large-transaction threshold is:

```text
max(3 × median transaction amount, ₹2,50,000)
```

The score then decreases as more unique transaction IDs are flagged.

An additional penalty is applied when flagged transactions make up more than 10% of the available transactions.

### Important wording

This is **rule-based anomaly/risk flagging**, not production fraud detection.

---

# 10. Multiple Synthetic SME Profiles

The Mock Account Aggregator selects a synthetic profile using the application's `business_id`.

The mapping is deterministic:

```text
SME001 → backend/data/transactions.json
          backend/data/gst.json

SME002 → backend/data/sme002_transactions.json
          backend/data/sme002_gst.json

SME003 → backend/data/sme003_transactions.json
          backend/data/sme003_gst.json
```

Unknown or missing business IDs fall back to `SME001`.

The selection is based on the **business ID**, not on the generated application ID.

This is important because two applications can use the same financial profile logic without making profile selection random.

## Example results

For a synthetic loan request of **₹8,00,000**, the current risk engine produces the following example outputs from the repository's data:

| Profile | Overall Score | Preliminary Recommended Limit |
|---|---:|---:|
| SME001 — Baseline | **72 / 100** | **₹5,76,000** |
| SME002 — Healthy | **94 / 100** | **₹7,52,000** |
| SME003 — Higher-Risk | **41 / 100** | **₹3,28,000** |

These are deterministic outputs from the included synthetic datasets and prototype rules.

They are **not** real credit grades, approved limits, or evidence of lending performance.

---

# 11. Technology Stack

## Frontend

- **Next.js 14** — React framework and application routing.
- **React 18** — UI components.
- **TypeScript** — typed frontend code.
- **Tailwind CSS** — styling.
- **Lucide React** — interface icons.

## Backend

- **Python** — backend language and risk-engine implementation.
- **FastAPI** — REST API framework.
- **Uvicorn** — ASGI server.
- **Pydantic** — request/response validation.

## Data & Logic

- JSON files for synthetic bank and GST records.
- Python dictionaries for in-memory application/consent/risk state.
- Deterministic Python calculations for the risk engine.

## Deployment

- **Vercel** — Next.js frontend.
- **Render** — FastAPI backend.
- **GitHub** — source control and project repository.

---

# 12. System Architecture

The prototype uses one Next.js frontend with two role-based experiences and one FastAPI backend.

```text
                         ┌─────────────────────┐
                         │    Next.js App      │
                         └──────────┬──────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 │                                     │
                 ▼                                     ▼
       ┌───────────────────┐                ┌───────────────────┐
       │     Bank UI       │                │      SME UI       │
       │      /bank        │                │      /sme         │
       └─────────┬─────────┘                └─────────┬─────────┘
                 │                                    │
                 └────────────────┬───────────────────┘
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │     FastAPI Backend    │
                     │                        │
                     │  Applications          │
                     │  Consents              │
                     │  Financial Data        │
                     │  Risk Analysis         │
                     └───────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
       ┌─────────────┐    ┌─────────────┐    ┌──────────────┐
       │ In-memory   │    │  Mock AA    │    │ Risk Engine  │
       │ application │    │             │    │              │
       │ consent     │    │ Synthetic   │    │ Deterministic│
       │ risk state  │    │ bank + GST  │    │ scoring      │
       └─────────────┘    └─────────────┘    └──────┬───────┘
                                                    │
                                                    ▼
                                          ┌──────────────────┐
                                          │ Risk Result      │
                                          │ Score             │
                                          │ Metrics           │
                                          │ Flags             │
                                          │ Explanation      │
                                          │ Credit Limit     │
                                          └──────────────────┘
```

### Architecture principles

1. The Bank and SME interfaces do **not** communicate directly with one another.
2. Both interfaces communicate with the FastAPI backend.
3. The backend owns consent state.
4. The Mock Account Aggregator is separate from the Risk Engine.
5. The Risk Engine consumes financial-data payloads and returns a structured result.
6. Risk calculations are deterministic.

---

# 13. Project Structure

```text
sme-trade-finance/
│
├── backend/
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py
│   │
│   ├── database/
│   │   ├── __init__.py
│   │   └── db.py
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   └── mock_aa.py
│   │
│   ├── risk_engine/
│   │   ├── __init__.py
│   │   └── engine.py
│   │
│   ├── data/
│   │   ├── transactions.json
│   │   ├── gst.json
│   │   ├── sme002_transactions.json
│   │   ├── sme002_gst.json
│   │   ├── sme003_transactions.json
│   │   └── sme003_gst.json
│   │
│   ├── main.py
│   ├── requirements.txt
│   ├── test_api.py
│   └── test_profiles.py
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   │
│   │   ├── bank/
│   │   │   ├── page.tsx
│   │   │   └── [application_id]/
│   │   │       └── page.tsx
│   │   │
│   │   └── sme/
│   │       ├── page.tsx
│   │       └── [consent_id]/
│   │           └── page.tsx
│   │
│   ├── components/
│   │   ├── bank/
│   │   │   ├── RiskDashboard.tsx
│   │   │   └── types.ts
│   │   └── sme/
│   │       ├── ConsentActions.tsx
│   │       ├── ConsentShell.tsx
│   │       ├── icons.tsx
│   │       ├── scopeCatalog.ts
│   │       └── types.ts
│   │
│   ├── package.json
│   └── ...
│
├── contracts/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── schemas/
│       ├── application.json
│       ├── consent.json
│       ├── financial_data.json
│       └── risk_result.json
│
├── AGENTS.md
├── PROJECT_SUMMARY.md
├── MULTI_SME_FIX_REPORT.md
├── .gitignore
└── README.md
```

### What the important folders do

#### `backend/api/`
Contains the FastAPI routes and request/response models.

#### `backend/services/`
Contains the Mock Account Aggregator implementation that selects and loads synthetic SME profiles.

#### `backend/risk_engine/`
Contains the deterministic financial-analysis logic.

#### `backend/data/`
Contains the synthetic bank transaction and GST datasets.

#### `backend/database/`
Contains the in-memory dictionaries used as the prototype's shared state.

#### `frontend/app/`
Contains Next.js route definitions.

#### `frontend/components/`
Contains reusable UI components for the Bank and SME experiences.

#### `contracts/`
Contains the API contract, architecture notes, and JSON schemas used to keep the different parts of the system compatible.

---

# 14. Backend API

The backend exposes the following endpoints.

## Health check

### `GET /api/health`

Used to confirm that the backend is running.

Response:

```json
{
  "status": "ok"
}
```

---

## Applications

### `POST /api/applications`

Creates a new SME loan application.

Request:

```json
{
  "business_id": "SME001",
  "loan_amount": 800000,
  "purpose": "Working Capital"
}
```

Response shape:

```json
{
  "application_id": "APP001",
  "business_id": "SME001",
  "loan_amount": 800000,
  "purpose": "Working Capital",
  "status": "PENDING_CONSENT"
}
```

### `GET /api/applications`

Returns the applications currently stored in the backend's in-memory state.

---

## Consents

### `POST /api/consents`

Creates a consent request for an existing application.

Request:

```json
{
  "application_id": "APP001",
  "requested_data": [
    "BANK_TRANSACTIONS",
    "GST_RECORDS"
  ],
  "purpose": "SME credit assessment"
}
```

The backend generates a consent ID and a 24-hour expiry timestamp.

### `GET /api/consents/{consent_id}`

Returns the current consent state and details.

### `GET /api/consents/application/{application_id}`

Finds the latest consent associated with an application.

### `POST /api/consents/{consent_id}/approve`

Approves a pending consent.

The consent moves:

```text
PENDING → APPROVED
```

### `POST /api/consents/{consent_id}/reject`

Rejects a pending consent.

The consent moves:

```text
PENDING → REJECTED
```

---

## Financial data

### `GET /api/financial-data/{consent_id}`

Returns synthetic financial data only when the consent is approved or already marked `DATA_READY`.

If the consent is pending or rejected, the API blocks the request.

Response shape:

```json
{
  "consent_id": "CONS001",
  "data_source": "MOCK_AA",
  "bank_transactions": [],
  "gst_records": []
}
```

After a successful first fetch:

```text
APPROVED → DATA_READY
```

---

## Risk analysis

### `POST /api/risk/analyze/{application_id}`

Runs the deterministic risk engine for the application.

The backend checks that:

1. The application exists.
2. A consent record exists.
3. The consent has reached `APPROVED` or `DATA_READY`.
4. The appropriate synthetic financial profile can be loaded.

### `GET /api/risk/{application_id}`

Returns the most recently stored risk result for an application.

---

# 15. Running the Project Locally

## Prerequisites

Install:

- **Python 3.10+**
- **Node.js / npm**
- **Git**

Check your installed versions:

```bash
python --version
node --version
npm --version
git --version
```

The backend dependencies are listed in:

```text
backend/requirements.txt
```

The frontend dependencies are listed in:

```text
frontend/package.json
```

---

## 15.1 Start the Backend

Open Terminal 1.

From the repository root:

```bash
cd backend
```

Create a virtual environment:

### Windows PowerShell

```powershell
python -m venv .venv
```

Activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks script execution, use Command Prompt instead:

```cmd
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start FastAPI:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see the server running on:

```text
http://localhost:8000
```

### Test the backend

Open:

```text
http://localhost:8000/api/health
```

Expected:

```json
{"status":"ok"}
```

Open Swagger documentation:

```text
http://localhost:8000/docs
```

Swagger lets you inspect and manually call the API endpoints from your browser.

---

## 15.2 Start the Frontend

Open Terminal 2.

Go to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start Next.js:

```bash
npm run dev
```

The frontend should be available at:

```text
http://localhost:3000
```

---

# 16. Running the Tests

The repository includes backend tests for the API workflow and synthetic SME profiles.

## 16.1 API tests

The API test script makes HTTP requests to the running FastAPI server.

Therefore:

**Start Uvicorn first.**

Then open a third terminal:

```bash
cd backend
python test_api.py
```

The tests cover the end-to-end API lifecycle, including application creation, consent transitions, data-access guards, and risk-analysis behavior.

## 16.2 Multi-profile tests

The repository also contains:

```text
backend/test_profiles.py
```

This validates the deterministic SME profile selection and risk behavior for the synthetic profile set.

---

# 17. Using the Demo

The easiest way to understand the project is to run the complete flow manually.

## Step 1 — Open the Bank dashboard

Go to:

```text
http://localhost:3000/bank
```

## Step 2 — Create an application

Select a synthetic SME profile and enter:

- Loan amount.
- Purpose.

For a convenient example, use:

```text
Business: SME001
Loan amount: ₹8,00,000
Purpose: Working Capital
```

After submitting, the backend returns an application ID such as:

```text
APP001
```

## Step 3 — Create consent

Open the application review page and create the financial-data consent request.

The backend returns a consent ID such as:

```text
CONS001
```

## Step 4 — Open the SME portal

Go to:

```text
http://localhost:3000/sme
```

Enter the **actual consent ID returned by the backend**.

Do not assume that the consent will always be `CONS001`, because IDs are generated from the backend's current in-memory state.

## Step 5 — Review the consent

The SME can see:

- Application information.
- Requested data.
- Purpose.
- Consent ID.
- Expiry.

## Step 6 — Approve

Click **Approve**.

The backend changes the consent state to:

```text
APPROVED
```

The related application also changes state.

## Step 7 — Return to the Bank application

Return to the application review page.

After approval, the application workflow retrieves the permitted synthetic financial data.

The consent transitions to:

```text
DATA_READY
```

## Step 8 — Run risk analysis

Start the risk analysis.

The backend runs the deterministic engine.

## Step 9 — Review the result

The dashboard displays:

- Overall score.
- Five metrics.
- Risk flags.
- Explanations.
- Preliminary recommended credit limit.

## Step 10 — Try another synthetic profile

Create another application using `SME002` or `SME003`.

The application flow is the same, but the underlying financial evidence is different.

This demonstrates the core project idea:

> **Same risk engine + different financial evidence → different explainable assessments.**

---

# 18. Local Environment Configuration

The frontend is designed to use an API base URL rather than hardcoding the backend address in the main Bank/Risk pages.

By default, the local backend is:

```text
http://localhost:8000
```

For a deployed frontend, define:

```text
NEXT_PUBLIC_API_URL=https://your-backend-url
```

Example deployment value:

```text
NEXT_PUBLIC_API_URL=https://sme-nnmy.onrender.com
```

For local development, the fallback is:

```text
http://localhost:8000
```

### Example `.env.local`

Create this inside `frontend/` if you want to explicitly define the backend:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Do not commit secret credentials or private keys to GitHub.

---

# 19. Deployment

The current demo setup uses:

```text
                    Internet
                       │
                       ▼
             ┌───────────────────┐
             │ Vercel            │
             │ Next.js Frontend  │
             └─────────┬─────────┘
                       │ HTTPS
                       ▼
             ┌───────────────────┐
             │ Render            │
             │ FastAPI Backend   │
             │                   │
             │ Mock AA            │
             │ Risk Engine       │
             └───────────────────┘
```

## Frontend deployment

Deploy the `frontend` application to Vercel.

Configure the environment variable:

```text
NEXT_PUBLIC_API_URL
```

with the public FastAPI backend URL.

## Backend deployment

Deploy the `backend` application as a FastAPI web service.

A typical production start command for a Render-style service is:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### CORS

The current prototype allows broad CORS access for demonstration convenience.

A production system should restrict CORS to the trusted frontend origins instead of using:

```text
allow_origins = ["*"]
```

---

# 20. Troubleshooting

## Problem: `Error loading ASGI app. Could not import module "main"`

Make sure you are inside the `backend` directory before starting Uvicorn:

```bash
cd backend
uvicorn main:app --reload
```

The `main.py` file must be present in the current directory.

---

## Problem: `Connection refused` when running API tests

This usually means FastAPI is not running.

Start:

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Then run the test script from another terminal.

---

## Problem: `npm` says `package.json` is missing

You are probably in the wrong directory.

Run:

```bash
cd frontend
npm install
npm run dev
```

Check that this file exists:

```text
frontend/package.json
```

---

## Problem: Bank dashboard shows `Application not found`

Use the correct application routes.

### Correct

```text
/bank
/bank/APP001
```

### Do not use

```text
/bank/dashboard
```

Because the application review route is dynamic:

```text
/bank/[application_id]
```

Using `/bank/dashboard` causes `dashboard` to be interpreted as an application ID.

---

## Problem: Risk analysis says financial data is unavailable

Check the consent lifecycle.

The expected sequence is:

```text
PENDING
   ↓
APPROVED
   ↓
DATA_READY
   ↓
RISK ANALYSIS
```

You cannot run analysis against a pending or rejected consent.

---

## Problem: `TypeError: string indices must be integers`

The Risk Engine expects:

```text
bank_transactions = [transaction1, transaction2, ...]
```

It does **not** expect a dictionary such as:

```text
{
  "SME001": [...],
  "SME002": [...]
}
```

The Mock Account Aggregator resolves the profile and returns a flat list of transaction objects for the selected SME.

---

## Problem: SME actions point to the wrong backend

Confirm the frontend API base URL and environment configuration.

Local development should use:

```text
http://localhost:8000
```

A deployed frontend should use the deployed FastAPI URL.

After changing a Vercel environment variable, redeploy the frontend so the new value is included in the build.

---

# 21. Limitations

CredFlow is deliberately a prototype.

## Data limitations

- Financial data is synthetic.
- The Account Aggregator is mocked.
- No real bank accounts are connected.
- No real GST system is queried.

## Storage limitations

The backend currently uses Python dictionaries:

```text
applications_db
consents_db
risk_results_db
```

This means state is temporary and is lost when the backend process restarts.

A production system would need persistent storage.

## Risk-model limitations

The scoring logic is a prototype rule set.

It has not been presented as a validated production credit policy.

The debt metric is a synthetic debit-burden proxy because the project does not have a real debt schedule.

The transaction-risk component is deterministic anomaly flagging, not a production fraud-detection service.

## Security limitations

The current prototype does not implement a full production-grade authentication, authorization, consent security, audit, encryption, or secrets-management architecture.

---

# 22. Security and Data Disclaimer

### Synthetic data only

All financial records in this repository are fictional demonstration data.

Never replace the included data with real customer bank statements, GST records, credentials, or private financial information in a public repository.

### No real credit decisions

The risk engine output is a prototype analytical result.

It should not be interpreted as:

- A loan approval.
- A loan rejection.
- An approved credit limit.
- A regulated credit score.
- A guarantee of repayment.
- A substitute for human underwriting or applicable lending controls.

### Secrets

Do not commit:

```text
.env
.env.local
API keys
passwords
tokens
private credentials
```

The repository's `.gitignore` includes common local-secret and build-output patterns.

---

# 23. Future Improvements

A production-oriented evolution of this prototype could include:

## Data integrations

- Real authorized Account Aggregator integration.
- Real financial information providers.
- Additional financial sources.

## Infrastructure

- PostgreSQL or another production database.
- Background jobs for data ingestion.
- Persistent application history.
- Audit/event logs.

## Security

- User authentication.
- Role-based authorization.
- Strong consent controls.
- Secure secret storage.
- Production CORS policy.
- Encryption and secure transport controls.

## Analytics

- Additional cash-flow features.
- More business-financial ratios.
- Historical model validation.
- Model monitoring.
- Human-review feedback loops.

## Product

- Better consent management.
- Application timeline/history.
- Underwriter notes.
- Audit trail.
- More granular financial-data scopes.
- Production-ready accessibility and error handling.

---

# 24. Why the Prototype Uses Deterministic Logic

The risk engine was intentionally kept deterministic for this demonstration.

A deterministic engine provides three useful properties for a prototype:

### Reproducibility

The same financial input produces the same output.

### Explainability

Each metric can be traced back to explicit calculations and rules.

### Debuggability

When a score changes, developers can inspect the underlying financial input and rule rather than debugging an opaque generated response.

This does **not** mean deterministic rules are inherently better than machine-learning models for production underwriting. It means they are easier to inspect and demonstrate in this prototype.

---

# 25. Demo URLs

## Local

### Landing page

```text
http://localhost:3000/
```

### Bank dashboard

```text
http://localhost:3000/bank
```

### Example bank application

```text
http://localhost:3000/bank/APP001
```

Use an actual application ID returned by the backend.

### SME portal

```text
http://localhost:3000/sme
```

### Example SME consent page

```text
http://localhost:3000/sme/CONS001
```

Use an actual consent ID returned by the backend.

### FastAPI health check

```text
http://localhost:8000/api/health
```

### FastAPI docs

```text
http://localhost:8000/docs
```

## Deployed demo

### Frontend

```text
https://sme-sepia.vercel.app
```

### Backend

```text
https://sme-nnmy.onrender.com
```

### Backend docs

```text
https://sme-nnmy.onrender.com/docs
```

These URLs are the current demo deployment references. Availability can change if the deployments are stopped, redeployed, or reconfigured.

---

# 26. GitHub Setup

## Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

## Backend setup

```bash
cd backend
python -m venv .venv
```

Activate the environment and install:

```bash
pip install -r requirements.txt
```

## Frontend setup

In another terminal:

```bash
cd frontend
npm install
```

## Before pushing changes

Run:

```bash
git status
```

Make sure you are not committing:

```text
node_modules/
.next/
.venv/
.env
```

Then:

```bash
git add .
git commit -m "Update project documentation"
git push
```

---

# 27. License

No separate open-source license is currently declared for this repository.

Unless a license is added to the repository, treat the code and assets as **project/demo work intended for viewing and evaluation**, rather than automatically licensed for unrestricted reuse.

---

## Final Note

CredFlow was built as an end-to-end prototype to demonstrate a specific workflow:

```text
Consent
   ↓
Authorized Financial Data
   ↓
Deterministic Analysis
   ↓
Risk Metrics
   ↓
Explainable Assessment
   ↓
Preliminary Credit Limit
```

The most important part of the prototype is not the final number alone. It is the complete chain connecting **SME consent, structured financial data, deterministic analysis, and an underwriter-facing explanation**.

---

## Maintainers / Project Team

This repository was developed as a collaborative project with separate work across:

- Frontend / Bank experience
- Frontend / SME consent experience
- FastAPI backend and API integration
- Mock Account Aggregator and synthetic data
- Risk engine and financial analysis

See [`AGENTS.md`](AGENTS.md), [`contracts/ARCHITECTURE.md`](contracts/ARCHITECTURE.md), and [`contracts/API.md`](contracts/API.md) for the internal development rules and technical contracts.
