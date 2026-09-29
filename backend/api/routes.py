"""
API routes for the SME Trade Finance backend.

Every endpoint listed in contracts/API.md is implemented here.
Field names match the API contract exactly — do NOT rename them.

Consent status lifecycle (from ARCHITECTURE.md §6):
    PENDING  →  APPROVED  →  DATA_READY
    PENDING  →  REJECTED
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database.db import (
    applications_db,
    consents_db,
    generate_id,
    risk_results_db,
)
from services.mock_aa import MockAAProvider

router = APIRouter()
mock_aa = MockAAProvider()


# =====================================================================
# Pydantic request / response models
# Field names mirror contracts/API.md exactly.
# =====================================================================


# --- Application models ---

class ApplicationCreate(BaseModel):
    """POST /api/applications — request body."""
    business_id: str
    loan_amount: float
    purpose: str


class ApplicationResponse(BaseModel):
    """POST /api/applications — response body."""
    application_id: str
    business_id: str
    loan_amount: float
    purpose: str
    status: str  # "PENDING_CONSENT"


# --- Consent models ---

class ConsentCreate(BaseModel):
    """POST /api/consents — request body."""
    application_id: str
    requested_data: List[str]
    purpose: str


class ConsentResponse(BaseModel):
    """Full consent record returned by most consent endpoints."""
    consent_id: str
    application_id: str
    status: str  # PENDING | APPROVED | DATA_READY | REJECTED
    requested_data: List[str]
    purpose: str
    expires_at: str  # ISO-8601


class ConsentActionResponse(BaseModel):
    """Abbreviated response for approve / reject."""
    consent_id: str
    status: str


# --- Risk models (structure from contracts/schemas/risk_result.json) ---

class RiskMetrics(BaseModel):
    cash_flow_stability: int
    revenue_stability: int
    debt_health: int
    gst_consistency: int
    transaction_risk: int


class RiskResult(BaseModel):
    application_id: str
    overall_score: int  # 0–100
    recommended_credit_limit: float
    metrics: RiskMetrics
    risk_flags: List[str]
    explanation: List[str]


# =====================================================================
# Endpoints
# =====================================================================


# 1. POST /api/applications — Create a loan application
# -----------------------------------------------------------------

@router.post("/api/applications", response_model=ApplicationResponse)
def create_application(body: ApplicationCreate):
    app_id = generate_id("APP", len(applications_db) + 1)
    record = {
        "application_id": app_id,
        "business_id": body.business_id,
        "loan_amount": body.loan_amount,
        "purpose": body.purpose,
        "status": "PENDING_CONSENT",
    }
    applications_db[app_id] = record
    return record


# 1b. GET /api/applications — Get all applications
# -----------------------------------------------------------------

@router.get("/api/applications", response_model=List[ApplicationResponse])
def get_applications():
    """Retrieve all applications from the in-memory database."""
    return list(applications_db.values())


# 2. POST /api/consents — Create a consent request
# -----------------------------------------------------------------

@router.post("/api/consents", response_model=ConsentResponse)
def create_consent(body: ConsentCreate):
    if body.application_id not in applications_db:
        raise HTTPException(status_code=404, detail="Application not found")

    consent_id = generate_id("CONS", len(consents_db) + 1)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    record = {
        "consent_id": consent_id,
        "application_id": body.application_id,
        "status": "PENDING",
        "requested_data": body.requested_data,
        "purpose": body.purpose,
        "expires_at": expires_at.isoformat(),
    }
    consents_db[consent_id] = record
    return record


# 3. GET /api/consents/{consent_id} — Get consent status / details
# -----------------------------------------------------------------

@router.get("/api/consents/{consent_id}", response_model=ConsentResponse)
def get_consent(consent_id: str):
    if consent_id not in consents_db:
        raise HTTPException(status_code=404, detail="Consent not found")
    return consents_db[consent_id]


# 3b. GET /api/consents/application/{application_id} — Get consent by app ID
# -----------------------------------------------------------------

@router.get("/api/consents/application/{application_id}", response_model=ConsentResponse)
def get_consent_by_application(application_id: str):
    if application_id not in applications_db:
        raise HTTPException(status_code=404, detail="Application not found")
        
    consent = _find_consent_for_application(application_id)
    if not consent:
        raise HTTPException(status_code=404, detail="No consent found for this application")
        
    return consent


# 4. POST /api/consents/{consent_id}/approve — SME approves consent
# -----------------------------------------------------------------

@router.post(
    "/api/consents/{consent_id}/approve",
    response_model=ConsentActionResponse,
)
def approve_consent(consent_id: str):
    if consent_id not in consents_db:
        raise HTTPException(status_code=404, detail="Consent not found")

    consent = consents_db[consent_id]

    if consent["status"] != "PENDING":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve consent with status '{consent['status']}'. "
                   f"Only PENDING consents can be approved.",
        )

    # Update consent status
    consent["status"] = "APPROVED"
    
    # Synchronize parent application status
    app_id = consent["application_id"]
    if app_id in applications_db:
        applications_db[app_id]["status"] = "APPROVED"
        
    return {"consent_id": consent_id, "status": consent["status"]}


# 5. POST /api/consents/{consent_id}/reject — SME rejects consent
# -----------------------------------------------------------------

@router.post(
    "/api/consents/{consent_id}/reject",
    response_model=ConsentActionResponse,
)
def reject_consent(consent_id: str):
    if consent_id not in consents_db:
        raise HTTPException(status_code=404, detail="Consent not found")

    consent = consents_db[consent_id]

    if consent["status"] != "PENDING":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject consent with status '{consent['status']}'. "
                   f"Only PENDING consents can be rejected.",
        )

    # Update consent status
    consent["status"] = "REJECTED"
    
    # Synchronize parent application status
    app_id = consent["application_id"]
    if app_id in applications_db:
        applications_db[app_id]["status"] = "REJECTED"
        
    return {"consent_id": consent_id, "status": consent["status"]}


# 6. GET /api/financial-data/{consent_id} — Fetch permitted data
# -----------------------------------------------------------------

@router.get("/api/financial-data/{consent_id}")
def get_financial_data(consent_id: str):
    consent = consents_db.get(consent_id)
    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")

    if consent["status"] not in ("APPROVED", "DATA_READY"):
        raise HTTPException(
            status_code=403,
            detail=f"Consent status is '{consent['status']}'. "
                   f"Financial data is only available after approval.",
        )

    try:
        data = mock_aa.fetch_financial_data(consent_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="Synthetic data files not found in backend/data/. "
                   "Ensure transactions.json and gst.json exist.",
        )

    # Update both consent and application to DATA_READY
    if consent["status"] == "APPROVED":
        consent["status"] = "DATA_READY"
        app_id = consent["application_id"]
        if app_id in applications_db:
            applications_db[app_id]["status"] = "DATA_READY"

    return data


# 7. POST /api/risk/analyze/{application_id} — Run risk analysis
# -----------------------------------------------------------------

@router.post("/api/risk/analyze/{application_id}", response_model=RiskResult)
def run_risk_analysis(application_id: str):
    if application_id not in applications_db:
        raise HTTPException(status_code=404, detail="Application not found")

    # Fetch the loan amount needed for the credit limit calculation
    requested_amount = applications_db[application_id]["loan_amount"]

    consent = _find_consent_for_application(application_id)
    if not consent:
        raise HTTPException(
            status_code=400,
            detail="No consent record found for this application. Create and approve a consent first.",
        )
    if consent["status"] not in ("APPROVED", "DATA_READY"):
        raise HTTPException(
            status_code=400,
            detail=f"Consent status is '{consent['status']}'. Financial data must be available before running analysis.",
        )

    try:
        financial_data = mock_aa.fetch_financial_data(consent["consent_id"])
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="Synthetic data files missing — cannot run analysis.",
        )

    # PLUG-IN IMPLEMENTED
    from risk_engine.engine import analyze
    result = analyze(application_id, financial_data, requested_amount)

    risk_results_db[application_id] = result
    return result


# 8. GET /api/risk/{application_id} — Retrieve stored risk result
# -----------------------------------------------------------------

@router.get("/api/risk/{application_id}", response_model=RiskResult)
def get_risk_result(application_id: str):
    if application_id not in applications_db:
        raise HTTPException(status_code=404, detail="Application not found")

    result = risk_results_db.get(application_id)
    if not result:
        raise HTTPException(
            status_code=404,
            detail="Risk analysis has not been run for this application yet. "
                   "Call POST /api/risk/analyze/{application_id} first.",
        )
    return result


# =====================================================================
# Internal helpers
# =====================================================================

def _find_consent_for_application(application_id: str) -> Optional[dict]:
    """Return the most recent consent record for an application, if any."""
    for consent in reversed(list(consents_db.values())):
        if consent["application_id"] == application_id:
            return consent
    return None