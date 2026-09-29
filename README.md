# CredFlow — Consent-First SME Credit Assessment

A hackathon prototype that helps banks understand an SME's financial health by using authorized bank and GST data to generate an explainable **preliminary credit assessment**.

> **Important:** This prototype uses synthetic financial data and a Mock Account Aggregator. It is intended for demonstration and does not make final lending decisions.

## 1. What CredFlow Does

CredFlow connects the consent and underwriting workflow into one flow:

```text
Bank creates application
        ↓
Bank requests financial consent
        ↓
SME reviews the request
        ↓
SME approves / rejects
        ↓
Mock Account Aggregator provides synthetic data
        ↓
Risk Engine analyzes financial signals
        ↓
Underwriter sees:
  • Overall score
  • Financial metrics
  • Risk flags
  • Explanations
  • Preliminary credit limit
```

The same deterministic risk engine can be demonstrated with different synthetic SME financial profiles.

## 2. Core Features

### Consent First
The SME explicitly approves the requested financial data before assessment.

### Explainable Assessment
The system shows the signals, flags and explanations behind the assessment instead of returning only a score.

### Multi-Signal Risk Analysis
The current prototype evaluates:

- Cash Flow — **35%**
- Revenue — **20%**
- Debt — **25%**
- GST — **10%**
- Transaction Risk — **10%**

### Deterministic & Reproducible
The same financial inputs produce the same assessment.

### Preliminary Credit Limit
The risk result includes a suggested preliminary credit limit for the requested amount.

### Mock Account Aggregator
The prototype simulates the financial-data access step using synthetic bank transactions and GST records.

## 3. Technology Stack

### Frontend
- Next.js
- React
- Tailwind CSS
- TypeScript

### Backend
- FastAPI
- Python
- Uvicorn

### Data
- Synthetic bank transactions
- Synthetic GST records
- Mock Account Aggregator

### Risk Engine
- Deterministic scoring
- Financial metrics
- Transaction anomaly detection
- Explainable rules

### Deployment
- GitHub
- Vercel for frontend
- FastAPI backend as a web service

## 4. Project Structure

```text
sme-trade-finance/
│
├── backend/
│   ├── api/
│   │   └── routes.py
│   ├── risk_engine/
│   │   └── engine.py
│   ├── services/
│   │   └── mock_aa.py
│   ├── data/
│   │   ├── transactions.json
│   │   └── gst.json
│   ├── main.py
│   ├── test_api.py
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── bank/
│   │   │   ├── page.tsx
│   │   │   └── [application_id]/
│   │   │       └── page.tsx
│   │   └── sme/
│   │       ├── page.tsx
│   │       └── [consent_id]/
│   │           └── page.tsx
│   ├── components/
│   │   ├── bank/
│   │   └── sme/
│   ├── package.json
│   └── ...
│
└── README.md
```

## 5. Running Locally

You need **Python** and **Node.js/npm** installed.

The backend and frontend run in separate terminals.

### Terminal 1 — Backend

From the project root:

```powershell
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend:

```text
http://localhost:8000
```

Swagger/API docs:

```text
http://localhost:8000/docs
```

### Terminal 2 — Frontend

Open a new terminal:

```powershell
cd frontend
```

Install dependencies the first time:

```powershell
npm install
```

Start Next.js:

```powershell
npm run dev
```

Frontend:

```text
http://localhost:3000
```

## 6. Run Backend Tests

The API tests make HTTP requests to the running FastAPI server, so **start Uvicorn first**.

With the backend server running, open another terminal:

```powershell
cd backend
python test_api.py
```

Expected result for the current test suite:

```text
15 passed, 0 failed
ALL TESTS PASSED
```

## 7. Application URLs

### Bank Dashboard

```text
http://localhost:3000/bank
```

### Bank Application Review

Example:

```text
http://localhost:3000/bank/APP001
```

### SME Portal

```text
http://localhost:3000/sme
```

### SME Consent Page

Example:

```text
http://localhost:3000/sme/CONS001
```

Use the **actual consent ID returned by the running backend** rather than assuming a fixed ID.

## 8. Demo Flow

A recommended demo sequence:

1. **Bank:** Open the Bank Dashboard and create/open an SME application.
2. **Consent:** Open the application and click **Request Financial Consent**.
3. **SME:** Open `/sme` and enter the exact Consent ID created by the bank.
4. **Review:** Show application ID, purpose, requested data and expiry.
5. **Approve:** Click **Approve**.
6. **Bank Risk Analysis:** Return to the Bank application review page and run risk analysis.
7. **Explain the Result:** Show overall score, five metrics, risk flags, explanations and preliminary credit limit.
8. **Second SME Profile:** Run the same risk engine on a different synthetic profile and demonstrate a different explainable assessment.

## 9. API Endpoints

### Applications

```text
POST /api/applications
GET  /api/applications
```

### Consents

```text
POST /api/consents
GET  /api/consents/{consent_id}
GET  /api/consents/application/{application_id}

POST /api/consents/{consent_id}/approve
POST /api/consents/{consent_id}/reject
```

### Financial Data

```text
GET /api/financial-data/{consent_id}
```

### Risk

```text
POST /api/risk/analyze/{application_id}
GET  /api/risk/{application_id}
```

## 10. Consent Lifecycle

```text
PENDING
   │
   ├── Approve → APPROVED → DATA_READY
   │
   └── Reject  → REJECTED
```

The backend owns the consent state.

## 11. Risk Engine

```text
Cash Flow          35%
Revenue            20%
Debt               25%
GST                10%
Transaction Risk   10%
                   ----
                   100%
```

The engine produces:

```text
0–100 Overall Score
        +
Metric Scores
        +
Risk Flags
        +
Explanations
        +
Preliminary Credit Limit
```

The engine is deterministic so that the same input data produces the same result.

## 12. Example Prototype Result

The current baseline example can produce:

```text
Overall Score:          72 / 100

Cash Flow:              44
Revenue:                88
Debt:                  100
GST:                    94
Transaction Risk:       50

Recommended Limit:
576,000
```

These are **prototype outputs from synthetic data**, not real underwriting policy, production limits, or proven credit performance.

## 13. Synthetic Data

The demo uses fictional financial records.

The current synthetic dataset contains:

- 12 months of GST records
- 48 bank transactions
- Deliberately inserted unusual transactions to demonstrate anomaly detection

Example anomalies include:

```text
"Unregistered Crypto Exchange Transfer"
"Massive Uninvoiced Wire Deposit"
```

These exist only to demonstrate explainable transaction-risk flags.

## 14. Multiple SME Profiles

CredFlow can use the same deterministic engine with different synthetic SME financial profiles.

```text
Stable SME
    ↓
Strong / consistent evidence
    ↓
Risk Engine
    ↓
Assessment A

Riskier SME
    ↓
Weaker cash flow + more anomalies
    ↓
Risk Engine
    ↓
Assessment B
```

> **Same risk engine + different financial evidence → different explainable assessments.**

## 15. Environment Variables

For local development, the frontend defaults to:

```text
http://localhost:8000
```

For deployment, set:

```text
NEXT_PUBLIC_API_URL=https://YOUR-BACKEND-URL
```

Example:

```text
NEXT_PUBLIC_API_URL=https://your-backend.example.com
```

Make sure frontend API calls use `API_BASE` instead of hardcoded production URLs.

## 16. Deployment

A simple deployment setup is:

```text
                Internet
                   │
                   ▼
        ┌────────────────────┐
        │ Vercel             │
        │ Next.js Frontend   │
        └─────────┬──────────┘
                  │ HTTPS
                  ▼
        ┌────────────────────┐
        │ FastAPI Backend    │
        │                    │
        │ Mock AA            │
        │ Risk Engine        │
        └────────────────────┘
```

### Frontend

Deploy the `frontend` directory as a Next.js application.

Set:

```text
NEXT_PUBLIC_API_URL
```

to the public URL of the backend.

### Backend

Deploy the `backend` directory as a FastAPI web service.

Typical start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

For deployment, configure CORS to allow the deployed frontend origin.

## 17. Important Prototype Limitations

This project is a hackathon prototype.

It currently uses:

- Synthetic financial data
- A Mock Account Aggregator
- Deterministic rule-based risk scoring
- In-memory application/consent/risk state

A production implementation would require:

- Secure authorized provider integrations
- Persistent database/storage
- Authentication and authorization
- Stronger security controls
- Privacy and consent controls
- Regulatory/compliance review
- Validation of scoring rules against real lending outcomes
- Monitoring and audit infrastructure

## 18. What CredFlow Does NOT Claim

CredFlow should not be presented as:

- An AI system that automatically approves or rejects loans
- A production-ready lending platform
- A real Account Aggregator integration when using the Mock AA
- A model with proven accuracy
- A replacement for an underwriter or lending decision

The prototype provides a **preliminary, explainable assessment to support underwriting review**.

## 19. Git Workflow

Before pushing the project to GitHub, make sure `node_modules` and environment files are ignored.

Recommended `.gitignore` entries:

```gitignore
node_modules/
.next/
dist/
__pycache__/
*.py[cod]
.venv/
.env
.env.local
.env.*.local
```

Then:

```powershell
git add .
git commit -m "Prepare CredFlow prototype"
git push
```

Do not commit `node_modules`.

## 20. Quick Start

```powershell
# Terminal 1
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2
cd frontend
npm install
npm run dev
```

Open:

```text
Bank: http://localhost:3000/bank
SME:  http://localhost:3000/sme
API:  http://localhost:8000/docs
```

## 21. Team / Hackathon

**Project:** CredFlow  
**Theme:** FinTech / SME Credit Assessment  
**Event:** Build With Bharat 4.0

Team:

```text
[Team Name]

[Member 1]
[Member 2]
[Member 3]
[Member 4]

[College Name]
```

GitHub:

```text
[Add repository URL]
```

Live Demo:

```text
[Add deployed URL]
```

## 22. Project Positioning

### Problem

> **SMEs have financial data, but turning it into a quick credit assessment is difficult.**

### Solution

> **We help banks quickly understand an SME's financial health by securely using its bank and GST data to identify risks and suggest a preliminary credit limit.**

### One-line description

> **CredFlow is a consent-first SME underwriting platform that turns authorized financial data into an explainable preliminary credit assessment.**
