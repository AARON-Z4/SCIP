# Deployment Readiness & Debugging Strategy Plan

## Phase 1 — Configuration & Environment Validation

**Deployment Risk Being Tested:** Silent failures caused by missing or misconfigured environment variables (Supabase keys, Gemini AI keys, API URLs) across Vercel and Railway.

**Test Scenarios:**
- Boot frontend without `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY`.
- Boot backend without `GEMINI_API_KEY` or `SUPABASE_URL`.
- Verify CORS allowed origins match Vercel production URL.
- Check `$PORT` binding on Railway for Uvicorn startup.

**Expected Behavior:**
- Fast-fail with explicit console errors ("Missing required environment variable XY").
- Apps should refuse to start rather than failing silently during user actions.

**Failure Indicators:**
- 500 errors on first API request.
- Blank white screen in React (Vite).
- Railway container crashes without descriptive logs.

**Severity If Failed:** High
**Confidence Impact:** Critical

---

## Phase 2 — Backend Stability & Concurrency Testing

**Deployment Risk Being Tested:** Unhandled exceptions in FastAPI crashing the single Uvicorn worker process.

**Test Scenarios:**
- Send malformed JSON payloads to the `/api/complaints` endpoint.
- Simulate an AI engine timeout natively to check if it blocks the main thread.
- Trigger invalid DB insertions (e.g., missing required columns) to test SQL error catching.

**Expected Behavior:**
- Graceful `HTTPException` returns (422 Unprocessable Entity or 503 Service Unavailable).
- Server remains alive to process subsequent requests.

**Failure Indicators:**
- 500 Internal Server Error with stack trace exposed.
- Worker process restarting or hanging indefinitely.

**Severity If Failed:** High
**Confidence Impact:** Major

---

## Phase 3 — API Contract & Validation Testing

**Deployment Risk Being Tested:** Mismatch between frontend TS types and backend Pydantic models (e.g., frontend sending "medium" but backend expecting "Medium").

**Test Scenarios:**
- Submit complaints missing optional fields.
- Send a payload with unexpected additional keys.
- Submit image URLs to backend as string vs array of strings.

**Expected Behavior:**
- Strict `422` validation errors for invalid types.
- Backend ignores extra fields securely.
- Frontend properly parses backend AnalysisResult payload.

**Failure Indicators:**
- Type errors in React rendering (`Cannot read properties of undefined`).
- Supabase SQL constraint violations triggered by bad backend parsing.

**Severity If Failed:** Medium
**Confidence Impact:** Moderate

---

## Phase 4 — Authentication & Session Lifecycle Testing

**Deployment Risk Being Tested:** Stale tokens, race conditions on mount, and session hijacking risks between Supabase and the custom Backend.

**Test Scenarios:**
- Refresh page while signed in (simulating Vercel cold boot routing).
- Submit a complaint with an expired JWT token.
- Attempt to access Admin dashboard with a regular user token.

**Expected Behavior:**
- Seamless session restore on reload.
- Token expires → intercepted by API interceptor → auto-redirect to `/signin`.
- Admin endpoints strictly return `403 Forbidden` for non-admins.

**Failure Indicators:**
- Flash of unauthenticated state before rendering correctly.
- Admin dashboard components visible (even if data fails).
- 401 Unauthorized crashes the app instead of graceful redirect.

**Severity If Failed:** High
**Confidence Impact:** Critical

---

## Phase 5 — Frontend Runtime & State Stability

**Deployment Risk Being Tested:** React state synchronization bugs, stale closures, and hydration mismatches during production builds.

**Test Scenarios:**
- Rapidly click "Submit & Analyze" multiple times.
- Navigate Back/Forward during an ongoing API request.
- Keep the `DuplicateDetected` page open for 30 minutes, then interact.

**Expected Behavior:**
- Buttons disable correctly on first click (isSubmitting state).
- AbortControllers cancel inflight requests on unmount.
- SessionStorage handles stale data gracefully if accessed out of context.

**Failure Indicators:**
- Duplicate submissions created in DB.
- App crashes due to `setState` on unmounted component.

**Severity If Failed:** Medium
**Confidence Impact:** Moderate

---

## Phase 6 — Storage & File Upload Reliability

**Deployment Risk Being Tested:** Edge cases in Supabase storage buckets, large payload rejections, and incorrect MIME types.

**Test Scenarios:**
- Upload files exactly at 5MB limit.
- Upload unsupported files (.pdf, .exe).
- Simulate a network drop mid-upload to the bucket.

**Expected Behavior:**
- Frontend securely blocks >5MB / non-image payloads.
- Partial uploads are cleared or ignored.
- Bucket returns public URLs accurately.

**Failure Indicators:**
- Upload hangs forever.
- Public URLs return 404 or missing access rights.

**Severity If Failed:** High
**Confidence Impact:** Major

---

## Phase 7 — Failure Injection & Edge Case Testing

**Deployment Risk Being Tested:** External dependency outages (Gemini API or Supabase down).

**Test Scenarios:**
- Temporarily change Gemini API key to an invalid one to simulate quota exhaustion/failure.
- Take Supabase DB offline momentarily.

**Expected Behavior:**
- Fallback UI displaying "AI Analysis Temporarily Unavailable".
- No raw database error strings exposed to the user.

**Failure Indicators:**
- Infinite loading spinners.
- 500 error page with no context.

**Severity If Failed:** Medium
**Confidence Impact:** Major

---

## Phase 8 — Load & Concurrency Simulation

**Deployment Risk Being Tested:** Race conditions in the AI duplication checking logic when concurrent complaints are submitted.

**Test Scenarios:**
- Submit 5 highly similar complaints simultaneously via script.
- Test connection pooling limits on the backend DB.

**Expected Behavior:**
- One complaint registers natively, the other 4 get flagged as duplicates correctly.
- DB connections queue correctly without dropping.

**Failure Indicators:**
- Duplicates fail to flag because vectors haven't persisted yet.
- "Too many connections" error from Supabase postgres wrapper.

**Severity If Failed:** Low (Edge Case)
**Confidence Impact:** Minor

---

## Phase 9 — Security & Data Integrity Checks

**Deployment Risk Being Tested:** RLS (Row Level Security) bypasses in Supabase and PII leaks.

**Test Scenarios:**
- User A attempts to track/view User B's complaint without the exact Reference ID.
- Check if Gemini prompts could be manipulated via prompt-injection in `description` field.

**Expected Behavior:**
- RLS blocks wild-card queries.
- `tracker` endpoint only yields data to authorized owners OR via precise ID matching.

**Failure Indicators:**
- PII (user phone/email) returned via unauthenticated tracker API.

**Severity If Failed:** Critical
**Confidence Impact:** Critical

---

## Phase 10 — Final Deployment Readiness Scoring

**Testing Matrix Scoring:**
- **Pass:** Expected behavior achieved natively.
- **Fail - Block:** Crash, Security Leak, Data Loss.
- **Fail - Warn:** Bad UX, Missing Error Boundary.

**Current Overall Deployment Risk Rating:** **Unknown (Pending Execution)**

**Areas requiring stabilization before redeploy:** *To be determined after running Phase 1-9 tests.*
**Areas safe for production:** *To be determined after running Phase 1-9 tests.*
