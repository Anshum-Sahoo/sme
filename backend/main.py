"""
SME Trade Finance — FastAPI Application Entry Point.

Start with:
    cd backend
    uvicorn main:app --reload

Interactive docs:  http://localhost:8000/docs
Health check:      http://localhost:8000/api/health
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router as api_router

app = FastAPI(
    title="SME Trade Finance API",
    description="Hackathon prototype — consent-driven SME credit assessment.",
    version="0.1.0",
)

# ------------------------------------------------------------------
# CORS — allow the Next.js frontend (any origin during hackathon).
# In production this should be restricted to the frontend's URL.
# ------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------
# Mount all /api/* routes from the router module.
# ------------------------------------------------------------------
app.include_router(api_router)


# ------------------------------------------------------------------
# Health check — defined directly on the app so it appears at the top
# of the auto-generated Swagger docs.
# ------------------------------------------------------------------
@app.get("/api/health", tags=["health"])
def health_check():
    """Simple liveness probe."""
    return {"status": "ok"}


# ------------------------------------------------------------------
# Dev convenience — `python main.py` starts uvicorn directly.
# ------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)