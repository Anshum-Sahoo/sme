# CredFlow SME Trade Finance — Multi-SME Profiles Bugfix & Verification Report

## 1. Overview & Root Cause Analysis

### The Bug
During multi-SME profile testing, executing:
```bash
python test_api.py
pytest test_profiles.py -v
```
failed with:
```python
TypeError: string indices must be integers, not 'str'
```
occurring in `backend/risk_engine/engine.py` during iteration over `financial_data["bank_transactions"]`.

### Root Cause
`backend/data/transactions.json` and `backend/data/gst.json` were incorrectly converted into nested dictionaries:
```json
{
  "SME001": [ ... ],
  "SME002": [ ... ],
  "SME003": [ ... ]
}
```
When `MockAAProvider.fetch_financial_data()` loaded `transactions.json`, `financial_data["bank_transactions"]` returned the dictionary keys (`"SME001"`, `"SME002"`, `"SME003"`) rather than a list of transaction dictionaries. The risk engine expects `financial_data["bank_transactions"]` and `financial_data["gst_records"]` to be flat lists according to `contracts/schemas/financial_data.json`.

---

## 2. Solution & Data Architecture

Each profile has dedicated flat-list JSON files in `backend/data/`:

```
backend/data/
    transactions.json           # SME001 Baseline transactions (List)
    gst.json                    # SME001 Baseline GST records (List)
    sme002_transactions.json    # SME002 Healthy transactions (List)
    sme002_gst.json             # SME002 Healthy GST records (List)
    sme003_transactions.json    # SME003 Higher-risk transactions (List)
    sme003_gst.json             # SME003 Higher-risk GST records (List)
```

### Profile Routing Flow
1. **Financial Data Endpoint** (`GET /api/financial-data/{consent_id}`):
   - Resolves `consent_id` → `application_id` → `business_id`.
   - Calls `mock_aa.fetch_financial_data(consent_id, business_id)`.

2. **Risk Analysis Endpoint** (`POST /api/risk/analyze/{application_id}`):
   - Resolves `application_id` → `business_id` and `application_id` → `consent`.
   - Calls `mock_aa.fetch_financial_data(consent["consent_id"], business_id)`.
   - Passes standard list payload to deterministic risk engine `analyze()`.

3. **Mock Account Aggregator Resolution** (`backend/services/mock_aa.py`):
   - `resolve_profile_id(business_id)` normalizes input with `business_id.strip().upper()`.
   - Maps:
     - `SME001` → `transactions.json` & `gst.json`
     - `SME002` → `sme002_transactions.json` & `sme002_gst.json`
     - `SME003` → `sme003_transactions.json` & `sme003_gst.json`
   - Any missing or unknown ID (`SME999`, `""`, `None`) deterministically falls back to `SME001`.

---

## 3. Profile Characteristics & Engine Outputs

All profiles are processed by the **identical, unchanged deterministic risk engine** (`backend/risk_engine/engine.py`):

| Dimension / Metric | SME001 (Baseline) | SME002 (Healthy) | SME003 (Higher Risk) |
|---|---|---|---|
| **Overall Score** | **72** | **94** (Strongest) | **41** (Weakest) |
| **Recommended Credit Limit** (Requested \$1M) | \$720,000 | \$940,000 | \$410,000 |
| **Cash Flow Stability (35%)** | 44 | 90 | 0 |
| **Revenue Stability (20%)** | 88 | 94 | 69 |
| **Debt Health Proxy (25%)** | 100 | 96 | 60 |
| **GST Consistency (10%)** | 94 | 100 | 94 |
| **Transaction Risk (10%)** | 50 | 100 | 25 |
| **Risk Flags** | 2 unusual txns (crypto, uninvoiced) | None | 3 unusual txns, GST sales mismatch |
| **Cash Flow Evidence** | Positive net cash flow | Positive net cash flow | Negative net cash flow in 6 months |

---

## 4. Verification & Test Execution

### 1. `pytest backend/test_profiles.py -v` (17/17 Passed)
```text
backend/test_profiles.py::test_a_sme001_baseline_schema_and_engine_output PASSED [  5%]
backend/test_profiles.py::test_a_sme001_is_deterministic_across_applications PASSED [ 11%]
backend/test_profiles.py::test_b_sme002_is_stronger_than_baseline PASSED [ 17%]
backend/test_profiles.py::test_b_sme002_data_has_no_suspicious_transactions PASSED [ 23%]
backend/test_profiles.py::test_c_sme003_is_weaker_than_baseline PASSED   [ 29%]
backend/test_profiles.py::test_c_sme003_data_is_realistic_not_all_suspicious PASSED [ 35%]
backend/test_profiles.py::test_d_same_application_analyzed_twice_is_identical PASSED [ 41%]
backend/test_profiles.py::test_d_same_profile_on_two_applications_is_identical_except_app_id PASSED [ 47%]
backend/test_profiles.py::test_d_financial_data_is_stable_between_requests PASSED [ 52%]
backend/test_profiles.py::test_e_unknown_business_id_uses_sme001_fallback PASSED [ 58%]
backend/test_profiles.py::test_e_profile_resolution_is_by_business_id_only PASSED [ 64%]
backend/test_profiles.py::test_e_application_id_does_not_influence_profile PASSED [ 70%]
backend/test_profiles.py::test_f_pending_consent_blocks_data_for_every_profile PASSED [ 76%]
backend/test_profiles.py::test_f_rejected_consent_blocks_data_for_every_profile PASSED [ 82%]
backend/test_profiles.py::test_f_approval_flow_and_status_lifecycle PASSED [ 88%]
backend/test_profiles.py::test_f_unknown_ids_still_return_404 PASSED     [ 94%]
backend/test_profiles.py::test_profile_data_quality PASSED               [100%]

======================== 17 passed, 1 warning in 2.47s ========================
```

### 2. `python backend/test_api.py` (15/15 Passed)
```text
============================================================
  RESULTS: 15 passed, 0 failed
============================================================
  ALL TESTS PASSED
```

---

## 5. Scope & Compliance Summary

- **Files Changed:**
  - `backend/data/transactions.json`: Extracted SME001 48 transaction records as flat list.
  - `backend/data/gst.json`: Extracted SME001 12 GST records as flat list.

- **Files NOT Changed:**
  - `frontend/*`: Untouched. Preserves existing Vercel deployment and `NEXT_PUBLIC_API_URL`.
  - `backend/risk_engine/engine.py`: Untouched. Deterministic weights and formulas preserved.
  - `backend/services/mock_aa.py`: Preserved.
  - `backend/api/routes.py`: Preserved.
  - `backend/test_api.py`: Preserved.
  - `backend/test_profiles.py`: Preserved.
