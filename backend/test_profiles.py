"""
Scenario tests for the deterministic SME financial profiles.

    SME001 -> baseline   SME002 -> strong / healthy   SME003 -> higher risk

Run from the backend/ directory:   pytest test_profiles.py

These tests assert RELATIONSHIPS between profiles (higher / lower / differs),
never arbitrary exact scores.  The SME001 baseline is checked by running the
unchanged risk engine directly on data/transactions.json + data/gst.json and
comparing against the API output, so no score is hard-coded here.

NOTE ON "TRANSACTION RISK": metrics.transaction_risk is a SCORE where higher
means SAFER.  "Lower transaction risk" therefore means a HIGHER metric value.
"""

import json
import os
import re

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes import router
from risk_engine.engine import analyze
from services.mock_aa import DEFAULT_PROFILE_ID, PROFILE_FILES, MockAAProvider

app = FastAPI()
app.include_router(router)
client = TestClient(app)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

RISK_KEYS = {
    "application_id", "overall_score", "recommended_credit_limit",
    "metrics", "risk_flags", "explanation",
}
METRIC_KEYS = {
    "cash_flow_stability", "revenue_stability", "debt_health",
    "gst_consistency", "transaction_risk",
}
FINANCIAL_DATA_KEYS = {"consent_id", "data_source", "bank_transactions", "gst_records"}
LOAN_AMOUNT = 1_000_000.0


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------

def _create_application(business_id):
    r = client.post("/api/applications", json={
        "business_id": business_id, "loan_amount": LOAN_AMOUNT, "purpose": "Working capital",
    })
    assert r.status_code == 200, r.text
    return r.json()["application_id"]


def _create_consent(application_id):
    r = client.post("/api/consents", json={
        "application_id": application_id,
        "requested_data": ["bank_transactions", "gst_records"],
        "purpose": "Credit assessment",
    })
    assert r.status_code == 200, r.text
    return r.json()["consent_id"]


def _approved_flow(business_id):
    """Create application + consent and approve it. Returns (app_id, consent_id)."""
    app_id = _create_application(business_id)
    consent_id = _create_consent(app_id)
    r = client.post(f"/api/consents/{consent_id}/approve")
    assert r.status_code == 200, r.text
    return app_id, consent_id


def _profile(business_id):
    """Run the full flow; return (financial_data, risk_result)."""
    app_id, consent_id = _approved_flow(business_id)
    fd = client.get(f"/api/financial-data/{consent_id}")
    assert fd.status_code == 200, fd.text
    rr = client.post(f"/api/risk/analyze/{app_id}")
    assert rr.status_code == 200, rr.text
    return fd.json(), rr.json()


def _load(name):
    with open(os.path.join(DATA_DIR, name), encoding="utf-8") as fh:
        return json.load(fh)


def _unusual_count(risk):
    for flag in risk["risk_flags"]:
        m = re.match(r"(\d+) unusual transactions detected", flag)
        if m:
            return int(m.group(1))
    return 0


def _without_app_id(risk):
    return {k: v for k, v in risk.items() if k != "application_id"}


# ---------------------------------------------------------------------
# TEST A - SME001 baseline
# ---------------------------------------------------------------------

def test_a_sme001_baseline_schema_and_engine_output():
    fd, risk = _profile("SME001")

    # Schema unchanged
    assert set(fd.keys()) == FINANCIAL_DATA_KEYS
    assert fd["data_source"] == "MOCK_AA"
    assert set(risk.keys()) == RISK_KEYS
    assert set(risk["metrics"].keys()) == METRIC_KEYS
    assert 0 <= risk["overall_score"] <= 100

    # Baseline data is the original files, and the API result is exactly what
    # the unchanged engine produces for them (no hard-coded scores).
    assert fd["bank_transactions"] == _load("transactions.json")
    assert fd["gst_records"] == _load("gst.json")
    expected = analyze(
        risk["application_id"],
        {"bank_transactions": _load("transactions.json"), "gst_records": _load("gst.json")},
        LOAN_AMOUNT,
    )
    assert risk == expected


def test_a_sme001_is_deterministic_across_applications():
    _, first = _profile("SME001")
    _, second = _profile("SME001")
    assert _without_app_id(first) == _without_app_id(second)


# ---------------------------------------------------------------------
# TEST B - SME002 healthy
# ---------------------------------------------------------------------

def test_b_sme002_is_stronger_than_baseline():
    fd1, r1 = _profile("SME001")
    fd2, r2 = _profile("SME002")

    assert set(fd2.keys()) == FINANCIAL_DATA_KEYS
    assert set(r2.keys()) == RISK_KEYS and set(r2["metrics"].keys()) == METRIC_KEYS

    assert fd2["bank_transactions"] != fd1["bank_transactions"]
    assert fd2["gst_records"] != fd1["gst_records"]
    assert _without_app_id(r2) != _without_app_id(r1)
    assert r2["metrics"] != r1["metrics"]

    assert r2["overall_score"] > r1["overall_score"]
    # transaction_risk is a score: higher == fewer/less severe anomalies
    assert r2["metrics"]["transaction_risk"] > r1["metrics"]["transaction_risk"]
    assert r2["metrics"]["cash_flow_stability"] > r1["metrics"]["cash_flow_stability"]
    assert r2["recommended_credit_limit"] > r1["recommended_credit_limit"]

    # No / very few anomaly flags, and none of the specific anomaly types
    assert len(r2["risk_flags"]) <= 1
    assert len(r2["risk_flags"]) < len(r1["risk_flags"])
    assert _unusual_count(r2) == 0
    joined = " ".join(r2["risk_flags"]).lower()
    assert "crypto" not in joined and "uninvoiced" not in joined
    assert r2["risk_flags"] != r1["risk_flags"]

    # Explanations reflect the evidence
    assert "Monthly net cash flow remains positive across the available period." in r2["explanation"]
    assert "No critical transactional anomalies were identified." in r2["explanation"]
    assert r2["explanation"] != r1["explanation"]


def test_b_sme002_data_has_no_suspicious_transactions():
    txns = _load("sme002_transactions.json")
    for t in txns:
        desc = t["description"].lower()
        assert t["category"] != "UNKNOWN"
        assert not any(w in desc for w in ("crypto", "unregistered", "uninvoiced"))
    assert all(g["filing_status"] == "FILED" for g in _load("sme002_gst.json"))


# ---------------------------------------------------------------------
# TEST C - SME003 higher risk
# ---------------------------------------------------------------------

def test_c_sme003_is_weaker_than_baseline():
    fd1, r1 = _profile("SME001")
    fd2, r2 = _profile("SME002")
    fd3, r3 = _profile("SME003")

    assert set(fd3.keys()) == FINANCIAL_DATA_KEYS
    assert set(r3.keys()) == RISK_KEYS and set(r3["metrics"].keys()) == METRIC_KEYS

    assert fd3["bank_transactions"] != fd1["bank_transactions"]
    assert fd3["gst_records"] != fd1["gst_records"]
    assert _without_app_id(r3) != _without_app_id(r1)
    assert r3["metrics"] != r1["metrics"]

    assert r3["overall_score"] < r1["overall_score"]
    assert r3["overall_score"] < r2["overall_score"]
    assert r3["metrics"]["transaction_risk"] < r2["metrics"]["transaction_risk"]
    assert r3["recommended_credit_limit"] < r1["recommended_credit_limit"]

    # More / stronger risk signals than the baseline and the healthy profile
    assert _unusual_count(r3) > _unusual_count(r1) > _unusual_count(r2)
    assert r3["metrics"]["transaction_risk"] < r1["metrics"]["transaction_risk"]
    assert r3["metrics"]["cash_flow_stability"] < r1["metrics"]["cash_flow_stability"]
    assert r3["metrics"]["debt_health"] < r1["metrics"]["debt_health"]
    assert r3["metrics"]["revenue_stability"] < r1["metrics"]["revenue_stability"]
    assert len(r3["risk_flags"]) > len(r2["risk_flags"])
    assert any("GST reported sales differ" in f for f in r3["risk_flags"])
    assert any("crypto" in f.lower() for f in r3["risk_flags"])

    # Explanations reflect negative cash-flow months
    assert any(re.match(r"Monthly net cash flow was negative in \d+ months\.", e)
               for e in r3["explanation"])
    assert "Monthly net cash flow remains positive across the available period." not in r3["explanation"]
    assert r3["explanation"] != r1["explanation"]


def test_c_sme003_data_is_realistic_not_all_suspicious():
    txns = _load("sme003_transactions.json")
    flagged = [t for t in txns if t["category"] == "UNKNOWN"]
    assert 2 <= len(flagged) <= 5
    assert len(flagged) / len(txns) < 0.10          # anomalies stay a small minority
    assert all(g["filing_status"] == "FILED" for g in _load("sme003_gst.json"))


# ---------------------------------------------------------------------
# TEST D - determinism (COMPLETE result dictionaries identical)
# ---------------------------------------------------------------------

def test_d_same_application_analyzed_twice_is_identical():
    for business_id in ("SME001", "SME002", "SME003"):
        app_id, _ = _approved_flow(business_id)
        first = client.post(f"/api/risk/analyze/{app_id}").json()
        second = client.post(f"/api/risk/analyze/{app_id}").json()
        stored = client.get(f"/api/risk/{app_id}").json()
        assert first == second == stored


def test_d_same_profile_on_two_applications_is_identical_except_app_id():
    for business_id in ("SME001", "SME002", "SME003"):
        _, a = _profile(business_id)
        _, b = _profile(business_id)
        assert a["application_id"] != b["application_id"]
        assert _without_app_id(a) == _without_app_id(b)


def test_d_financial_data_is_stable_between_requests():
    _, consent_id = _approved_flow("SME003")
    first = client.get(f"/api/financial-data/{consent_id}").json()
    second = client.get(f"/api/financial-data/{consent_id}").json()
    assert first == second


# ---------------------------------------------------------------------
# TEST E - unknown business_id falls back to SME001
# ---------------------------------------------------------------------

def test_e_unknown_business_id_uses_sme001_fallback():
    fd_base, r_base = _profile("SME001")
    for unknown in ("SME999", "ACME-LTD", ""):
        fd, r = _profile(unknown)
        assert fd["bank_transactions"] == fd_base["bank_transactions"]
        assert fd["gst_records"] == fd_base["gst_records"]
        assert _without_app_id(r) == _without_app_id(r_base)
        # determinism of the fallback itself
        _, r_again = _profile(unknown)
        assert _without_app_id(r_again) == _without_app_id(r)


def test_e_profile_resolution_is_by_business_id_only():
    aa = MockAAProvider()
    assert aa.resolve_profile_id("SME001") == "SME001"
    assert aa.resolve_profile_id("SME002") == "SME002"
    assert aa.resolve_profile_id("SME003") == "SME003"
    assert aa.resolve_profile_id(" sme002 ") == "SME002"       # whitespace/case-insensitive
    assert aa.resolve_profile_id("SME404") == DEFAULT_PROFILE_ID
    assert aa.resolve_profile_id(None) == DEFAULT_PROFILE_ID
    assert aa.resolve_profile_id("") == DEFAULT_PROFILE_ID
    assert DEFAULT_PROFILE_ID == "SME001"

    # Backwards-compatible call signature (no business_id) == SME001 baseline
    legacy = aa.fetch_financial_data("CONS-X")
    assert legacy["bank_transactions"] == _load("transactions.json")
    assert legacy["gst_records"] == _load("gst.json")

    # Every declared profile file exists and same input -> same output
    for pid in PROFILE_FILES:
        assert aa.fetch_financial_data("C", pid) == aa.fetch_financial_data("C", pid)


def test_e_application_id_does_not_influence_profile():
    # The profile follows business_id even though application ids are sequential
    # (APP001, APP002, ...): create SME003 first, then SME002, then SME001.
    _, r3 = _profile("SME003")
    _, r2 = _profile("SME002")
    _, r1 = _profile("SME001")
    assert r3["overall_score"] < r1["overall_score"] < r2["overall_score"]


# ---------------------------------------------------------------------
# TEST F - existing consent protections
# ---------------------------------------------------------------------

def test_f_pending_consent_blocks_data_for_every_profile():
    for business_id in ("SME001", "SME002", "SME003"):
        app_id = _create_application(business_id)
        consent_id = _create_consent(app_id)
        assert client.get(f"/api/consents/{consent_id}").json()["status"] == "PENDING"
        assert client.get(f"/api/financial-data/{consent_id}").status_code == 403
        assert client.post(f"/api/risk/analyze/{app_id}").status_code == 400


def test_f_rejected_consent_blocks_data_for_every_profile():
    for business_id in ("SME001", "SME002", "SME003"):
        app_id = _create_application(business_id)
        consent_id = _create_consent(app_id)
        r = client.post(f"/api/consents/{consent_id}/reject")
        assert r.status_code == 200 and r.json()["status"] == "REJECTED"
        assert client.get(f"/api/financial-data/{consent_id}").status_code == 403
        assert client.post(f"/api/risk/analyze/{app_id}").status_code == 400
        # a rejected consent cannot be approved afterwards
        assert client.post(f"/api/consents/{consent_id}/approve").status_code == 400


def test_f_approval_flow_and_status_lifecycle():
    app_id = _create_application("SME002")
    consent_id = _create_consent(app_id)

    r = client.post(f"/api/consents/{consent_id}/approve")
    assert r.status_code == 200 and r.json() == {"consent_id": consent_id, "status": "APPROVED"}
    assert client.post(f"/api/consents/{consent_id}/approve").status_code == 400
    assert client.post(f"/api/consents/{consent_id}/reject").status_code == 400

    assert client.get(f"/api/financial-data/{consent_id}").status_code == 200
    assert client.get(f"/api/consents/{consent_id}").json()["status"] == "DATA_READY"
    apps = {a["application_id"]: a for a in client.get("/api/applications").json()}
    assert apps[app_id]["status"] == "DATA_READY"
    assert apps[app_id]["business_id"] == "SME002"

    assert client.post(f"/api/risk/analyze/{app_id}").status_code == 200
    assert client.get(f"/api/risk/{app_id}").status_code == 200


def test_f_unknown_ids_still_return_404():
    assert client.get("/api/financial-data/CONS-NOPE").status_code == 404
    assert client.post("/api/risk/analyze/APP-NOPE").status_code == 404
    assert client.get("/api/risk/APP-NOPE").status_code == 404


# ---------------------------------------------------------------------
# Data quality (all profiles)
# ---------------------------------------------------------------------

def test_profile_data_quality():
    for pid, (txn_file, gst_file) in PROFILE_FILES.items():
        txns, gst = _load(txn_file), _load(gst_file)
        ids = [t["transaction_id"] for t in txns]
        assert len(ids) == len(set(ids)), pid
        assert [t["date"] for t in txns] == sorted(t["date"] for t in txns), pid
        assert all(t["type"] in ("CREDIT", "DEBIT") and t["amount"] > 0 for t in txns), pid
        assert all(set(t) == {"transaction_id", "date", "description", "amount",
                              "type", "balance", "category"} for t in txns), pid
        # running balance is arithmetically consistent and never negative
        for prev, cur in zip(txns, txns[1:]):
            delta = cur["amount"] if cur["type"] == "CREDIT" else -cur["amount"]
            assert cur["balance"] == prev["balance"] + delta, (pid, cur["transaction_id"])
        assert all(t["balance"] >= 0 for t in txns), pid
        # GST: one record per month, tax consistent with 18% of reported sales
        months = [g["month"] for g in gst]
        assert months == sorted(set(months)) and len(months) == 12, pid
        assert all(g["gst_paid"] == round(g["reported_sales"] * 0.18) for g in gst), pid
        assert all(set(g) == {"month", "reported_sales", "gst_paid", "filing_status"} for g in gst), pid
