"""
In-memory mock database for the hackathon MVP.

Stores applications, consents, and risk results as Python dictionaries.
This avoids SQLite setup overhead during the hackathon while still
providing a single shared state that both the Bank UI and SME UI
read/write through the FastAPI backend.

In a real system these would be proper database tables.
"""

# ------------------------------------------------------------------
# Shared state — imported by routes.py
# ------------------------------------------------------------------

# application_id -> { application_id, business_id, loan_amount, purpose, status }
applications_db: dict = {}

# consent_id -> { consent_id, application_id, status, requested_data, purpose, expires_at }
consents_db: dict = {}

# application_id -> { full risk result dict matching risk_result.json schema }
# Populated by Laptop 4's risk engine when POST /api/risk/analyze is called.
risk_results_db: dict = {}


def generate_id(prefix: str, count: int) -> str:
    """Generate a zero-padded ID like APP001, CONS001, etc."""
    return f"{prefix}{str(count).zfill(3)}"