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
"""

import json
import os
from typing import Any


class MockAAProvider:
    """Reads synthetic bank transactions and GST records from disk."""

    def __init__(self) -> None:
        # Resolve paths relative to the backend/ root regardless of cwd.
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.transactions_path = os.path.join(base_dir, "data", "transactions.json")
        self.gst_path = os.path.join(base_dir, "data", "gst.json")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def fetch_financial_data(self, consent_id: str) -> dict[str, Any]:
        """Return the full financial-data payload for a given consent.

        Raises FileNotFoundError (caught by the caller) if the synthetic
        data files are missing — which means the data/ directory has not
        been populated yet.
        """
        transactions = self._load_json(self.transactions_path)
        gst_records = self._load_json(self.gst_path)

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