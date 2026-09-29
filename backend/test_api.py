"""
End-to-end smoke test for the SME Trade Finance backend API.

Run with the server already started:
    uvicorn main:app --reload

Then in a separate terminal from the project root:
    python backend/test_api.py
"""

import json
import sys
import urllib.request
import urllib.error

BASE = "http://localhost:8000"
passed = 0
failed = 0


def req(method, path, body=None):
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"} if data else {}
    rq = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
    with urllib.request.urlopen(rq) as resp:
        result = json.loads(resp.read())
        print(f"  {method} {path} -> {resp.status}")
        print(f"  {json.dumps(result, indent=2)}")
        return result


def req_expect_error(method, path, expected_code, body=None):
    global passed, failed
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"} if data else {}
    rq = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
    try:
        urllib.request.urlopen(rq)
        print(f"  FAIL: {method} {path} expected {expected_code} but got 2xx")
        failed += 1
    except urllib.error.HTTPError as e:
        result = json.loads(e.read())
        if e.code == expected_code:
            print(f"  OK: {method} {path} -> {e.code} (expected)")
            passed += 1
        else:
            print(f"  FAIL: {method} {path} -> {e.code} (expected {expected_code})")
            failed += 1
        print(f"  {json.dumps(result, indent=2)}")
        return e.code


def section(title):
    print()
    print("=" * 60)
    print(f"  {title}")
    print("=" * 60)


# ------------------------------------------------------------------

section("TEST 1: Health check")
h = req("GET", "/api/health")
assert h["status"] == "ok"
passed += 1

section("TEST 2: Create application")
app = req("POST", "/api/applications", {
    "business_id": "SME001",
    "loan_amount": 800000,
    "purpose": "Working Capital",
})
assert "application_id" in app and isinstance(app["application_id"], str) and len(app["application_id"]) > 0
assert app["status"] == "PENDING_CONSENT"
passed += 1

section("TEST 3: Create consent")
consent = req("POST", "/api/consents", {
    "application_id": app["application_id"],
    "requested_data": ["BANK_TRANSACTIONS_12_MONTHS", "GST_RETURNS"],
    "purpose": "Credit Assessment",
})
cid = consent["consent_id"]
assert consent["status"] == "PENDING"
assert consent["application_id"] == app["application_id"]
passed += 1

section("TEST 4: Get consent")
c = req("GET", f"/api/consents/{cid}")
assert c["consent_id"] == cid
assert c["status"] == "PENDING"
passed += 1

section("TEST 5: Financial data BEFORE approval (expect 403)")
req_expect_error("GET", f"/api/financial-data/{cid}", 403)

section("TEST 6: Approve consent")
approved = req("POST", f"/api/consents/{cid}/approve")
assert approved["status"] == "APPROVED"
passed += 1

section("TEST 7: Double approve (expect 400)")
req_expect_error("POST", f"/api/consents/{cid}/approve", 400)

section("TEST 8: Fetch financial data (should succeed)")
fin = req("GET", f"/api/financial-data/{cid}")
assert fin["data_source"] == "MOCK_AA"
assert fin["consent_id"] == cid
assert len(fin["bank_transactions"]) > 0
assert len(fin["gst_records"]) > 0
print(f"  -> Got {len(fin['bank_transactions'])} transactions, {len(fin['gst_records'])} GST records")
passed += 1

section("TEST 9: Consent should now be DATA_READY")
c2 = req("GET", f"/api/consents/{cid}")
assert c2["status"] == "DATA_READY"
passed += 1

section("TEST 10: Run risk analysis (expect 200)")
risk_result = req("POST", f"/api/risk/analyze/{app['application_id']}")
assert risk_result["overall_score"] >= 0 and risk_result["overall_score"] <= 100
assert risk_result["recommended_credit_limit"] <= app["loan_amount"]
assert "explanation" in risk_result and isinstance(risk_result["explanation"], list)
print(f"  -> Analyzed! Score: {risk_result['overall_score']}, Limit: ${risk_result['recommended_credit_limit']}")
passed += 1

section("TEST 11: Get stored risk result (expect 200)")
stored_risk = req("GET", f"/api/risk/{app['application_id']}")
assert stored_risk["application_id"] == app["application_id"]
assert stored_risk["metrics"]["cash_flow_stability"] >= 0
passed += 1

section("TEST 12: Reject flow — new app + consent")
app2 = req("POST", "/api/applications", {
    "business_id": "SME002",
    "loan_amount": 500000,
    "purpose": "Import Finance",
})
consent2 = req("POST", "/api/consents", {
    "application_id": app2["application_id"],
    "requested_data": ["BANK_TRANSACTIONS_12_MONTHS"],
    "purpose": "Trade Assessment",
})
cid2 = consent2["consent_id"]
rejected = req("POST", f"/api/consents/{cid2}/reject")
assert rejected["status"] == "REJECTED"
passed += 1

print()
print("  Verify rejected consent blocks data fetch (expect 403):")
req_expect_error("GET", f"/api/financial-data/{cid2}", 403)

print()
print("  Verify rejected consent blocks risk analysis (expect 400):")
req_expect_error("POST", f"/api/risk/analyze/{app2['application_id']}", 400)

section("TEST 13: Unit Test Risk Engine Determinism")
from risk_engine.engine import analyze

dummy_data = {
    "bank_transactions": [
        {"transaction_id": "1", "date": "2026-01-01", "description": "sales", "amount": 100000, "type": "CREDIT", "category": "SALES"},
        {"transaction_id": "2", "date": "2026-01-15", "description": "crypto uninvoiced", "amount": 500000, "type": "DEBIT", "category": "UNKNOWN"}
    ],
    "gst_records": []
}
unit_res_1 = analyze("TEST_APP", dummy_data, 100000)
unit_res_2 = analyze("TEST_APP", dummy_data, 100000)

# Exact dictionary equivalence check
assert unit_res_1 == unit_res_2, "Risk analysis is nondeterministic!"

# Value range and structure checks
assert 0 <= unit_res_1["overall_score"] <= 100, "overall_score must be between 0 and 100"
assert unit_res_1["recommended_credit_limit"] <= 100000, "recommended_credit_limit exceeds requested amount"
assert isinstance(unit_res_1["risk_flags"], list), "risk_flags must be a list"
assert isinstance(unit_res_1["explanation"], list), "explanation must be a list"

expected_metrics = [
    "cash_flow_stability", 
    "revenue_stability", 
    "debt_health", 
    "gst_consistency", 
    "transaction_risk"
]
for metric in expected_metrics:
    assert metric in unit_res_1["metrics"], f"Missing metric: {metric}"

print("  -> Unit test passed strict determinism, schema, and bounds check.")
passed += 1

# ------------------------------------------------------------------

print()
print("=" * 60)
print(f"  RESULTS: {passed} passed, {failed} failed")
print("=" * 60)

if failed > 0:
    sys.exit(1)
else:
    print("  ALL TESTS PASSED")
    sys.exit(0)