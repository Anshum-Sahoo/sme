# AI Coding Agent Instructions

## Project

SME Trade Finance Account Aggregator Validator — Hackathon MVP.

This project is a consent-driven SME trade-finance underwriting prototype using a Next.js frontend, FastAPI backend, Mock Account Aggregator, synthetic financial data, and deterministic risk analysis.

## Read Before Coding

Before making changes, read:

1. `README.md`
2. `contracts/ARCHITECTURE.md`
3. `contracts/API.md`
4. All relevant files in `contracts/schemas/`

## Rules

1. Read the contracts before coding.
2. Do not invent API endpoints.
3. Do not rename API fields.
4. Do not change response structures casually.
5. Reuse existing code.
6. Do not modify another team's directory unless explicitly agreed.
7. Do not introduce unnecessary libraries.
8. Do not hardcode final risk results in the frontend.
9. Use synthetic data only.
10. Keep risk calculations deterministic.
11. Test after changes.
12. Do not break working code.

## Architecture Rules

* Use one Next.js frontend.
* Use `/bank` for the Bank UI.
* Use `/sme` for the SME UI.
* Use one FastAPI backend.
* Both frontend roles communicate with the same backend.
* The backend/database owns shared consent state.
* Use the Mock AA instead of real bank integrations for the demo.
* Keep the Risk Engine separate from the Mock AA.

## API Rules

Use the endpoints and fields documented in `contracts/API.md`.

Do not create alternate endpoint names or different consent status values.

If a contract appears incomplete or a change is required, tell the team and agree on the change before implementing it.

## Data Rules

* Use fictional business records.
* Use fictional bank transactions.
* Use fictional GST records.
* Never use real customer or financial credentials.
* Keep example data consistent across the Bank UI, SME UI, and Risk Engine.

## Risk Engine Rules

* Use deterministic calculations.
* Produce an overall score from 0–100.
* Return metric values, risk flags, explanations, and a recommended credit limit.
* Do not use an LLM to calculate the numerical credit score.
* Clearly treat the score and limit as demo outputs, not real lending decisions.

## Frontend Rules

* Call the backend API instead of inventing independent frontend state for shared consent.
* Display status values returned by the backend.
* Do not hardcode a final risk result as if it were calculated.
* Keep the Bank and SME workflows aligned with the API contract.

## Git Rules

* Work on the assigned branch.
* Do not directly commit to `main`.
* Keep commits small and focused.
* Avoid editing another teammate's owned files.
* Create a Pull Request for integration.
* Pull the latest `main` before starting or integrating work.

## Definition of Done

A task is complete when:

* It follows the shared architecture.
* It uses the agreed API and schema.
* It stays within the assigned file ownership.
* It uses synthetic data where needed.
* It has been tested.
* It does not break the existing end-to-end demo.
