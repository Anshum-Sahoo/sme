"""
Mock Account Aggregator (AA) Provider.

Simulates an external Account Aggregator service by loading synthetic
JSON data from backend/data/.  In a real system this would call an
external AA API; here it simply reads local files.

The returned structure matches contracts/schemas/financial_data.json:
  {
    "consent_id": "...",
    "data_source": "MOCK_AA",
    "bank_transactions": [ ... ],
    "gst_records": [ ... ]
  }

Synthetic SME profiles
----------------------
The profile is selected DETERMINISTICALLY from the application's
``business_id`` (never from application_id, never randomly):

    SME001 -> baseline     (data/transactions.json, data/gst.json)
    SME002 -> strong       (data/sme002_transactions.json, data/sme002_gst.json)
    SME003 -> higher risk  (data/sme003_transactions.json, data/sme003_gst.json)

Unknown / missing business IDs deterministically FALL BACK to SME001, so
existing clients that use any other business_id keep their previous
behaviour.  business_id matching ignores surrounding whitespace and case.
"""

import json
import os
from typing import Any, Optional

# Profile used for unknown / missing business IDs (and the regression baseline).
DEFAULT_PROFILE_ID = "SME001"

# business_id -> (transactions file, gst file), relative to backend/data/.
# SME001 keeps the original file names so the baseline data is untouched.
PROFILE_FILES: dict[str, tuple[str, str]] = {
    "SME001": ("transactions.json", "gst.json"),
    "SME002": ("sme002_transactions.json", "sme002_gst.json"),
    "SME003": ("sme003_transactions.json", "sme003_gst.json"),
}


class MockAAProvider:
    """Reads synthetic bank transactions and GST records from disk."""

    def __init__(self) -> None:
        # Resolve paths relative to the backend/ root regardless of cwd.
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.data_dir = os.path.join(base_dir, "data")
        # Kept for backwards compatibility (baseline SME001 files).
        self.transactions_path = os.path.join(self.data_dir, PROFILE_FILES[DEFAULT_PROFILE_ID][0])
        self.gst_path = os.path.join(self.data_dir, PROFILE_FILES[DEFAULT_PROFILE_ID][1])

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @staticmethod
    def resolve_profile_id(business_id: Optional[str]) -> str:
        """Map a business_id to a known profile id.

        Deterministic: the same business_id always yields the same profile.
        Unknown, empty or non-string values fall back to DEFAULT_PROFILE_ID
        (SME001).
        """
        if isinstance(business_id, str):
            key = business_id.strip().upper()
            if key in PROFILE_FILES:
                return key
        return DEFAULT_PROFILE_ID

    def fetch_financial_data(
        self, consent_id: str, business_id: Optional[str] = None
    ) -> dict[str, Any]:
        """Return the full financial-data payload for a given consent.

        ``business_id`` selects the synthetic SME profile (see module
        docstring).  Omitting it, or passing an unknown id, returns the
        SME001 baseline — identical to the pre-profile behaviour.

        The response shape is unchanged: consent_id, data_source,
        bank_transactions, gst_records.

        Raises FileNotFoundError (caught by the caller) if the synthetic
        data files are missing — which means the data/ directory has not
        been populated yet.
        """
        profile_id = self.resolve_profile_id(business_id)
        txn_file, gst_file = PROFILE_FILES[profile_id]

        transactions = self._load_json(os.path.join(self.data_dir, txn_file))
        gst_records = self._load_json(os.path.join(self.data_dir, gst_file))

        return {
            "consent_id": consent_id,
            "data_source": "MOCK_AA",
            "bank_transactions": transactions,
            "gst_records": gst_records,
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _load_json(path: str) -> Any:
        """Load and parse a JSON file. Raises FileNotFoundError on miss."""
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
