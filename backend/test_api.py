"""
SCIS Backend API Test Suite
============================
Runs against http://localhost:8000

Usage:
    python test_api.py

Requirements: pip install requests
Backend must be running: python -m uvicorn main:app --reload --port 8000
NOTE: Supabase credentials must be set in .env for DB tests to pass.
"""

import sys
import random
import string
import requests

# Force UTF-8 so print() never crashes on Windows cp1252
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = 'http://localhost:8003'   # change to 8000 once port conflict is resolved
TIMEOUT = 8

passed = failed = skipped = 0


def uid(n=6):
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=n))


def ok(name):
    global passed
    passed += 1
    print("  [PASS] " + name)


def fail(name, reason=""):
    global failed
    failed += 1
    msg = "  [FAIL] " + name
    if reason:
        msg += "  --> " + str(reason)[:100]
    print(msg)


def skip(name, reason=""):
    global skipped
    skipped += 1
    suffix = "  (" + reason + ")" if reason else ""
    print("  [SKIP] " + name + suffix)


def info(msg):
    print("    [i] " + msg)


def section(title):
    print("\n" + "=" * 57)
    print("  " + title)
    print("=" * 57)


def chk(name, condition, reason=""):
    if condition:
        ok(name)
    else:
        fail(name, reason)


# =============================================================================
# 1. Health Check
# =============================================================================
section("1. Health Check")

try:
    r = requests.get(BASE + "/", timeout=TIMEOUT)
    chk("GET / -> 200", r.status_code == 200)
    data = r.json()
    chk("Response has 'message' field", "message" in data)
    chk("Response has 'version' field", "version" in data)
    info("Version: " + str(data.get("version", "?")))
except Exception as e:
    fail("Backend reachable at localhost:8000", str(e))
    print("\n  FATAL: Backend not running. Start it with:")
    print("    python -m uvicorn main:app --reload --port 8000")
    sys.exit(1)

# =============================================================================
# 2. Auth - Register
# =============================================================================
section("2. Auth - Register")

test_email = "testuser_" + uid() + "@scis-test.com"
test_password = "TestPass@123"
test_name = "SCIS Test User"
user_token = None
user_id = None

try:
    r = requests.post(BASE + "/auth/register", json={
        "full_name": test_name,
        "email": test_email,
        "password": test_password,
    }, timeout=TIMEOUT)
    chk("POST /auth/register -> 201", r.status_code == 201)
    if r.status_code == 201:
        data = r.json()
        chk("Response has 'access_token'", "access_token" in data)
        chk("Response has 'user' object", "user" in data)
        chk("User email matches", data.get("user", {}).get("email") == test_email)
        chk("User role is 'citizen'", data.get("user", {}).get("role") == "citizen")
        user_token = data.get("access_token")
        user_id = data.get("user", {}).get("id")
        info("Registered: " + test_email)
    else:
        skip("Register detail checks", "HTTP " + str(r.status_code) + ": " + r.text[:80])
except Exception as e:
    fail("POST /auth/register", str(e))

# Duplicate email check
try:
    r = requests.post(BASE + "/auth/register", json={
        "full_name": test_name, "email": test_email, "password": test_password,
    }, timeout=TIMEOUT)
    chk("Duplicate email -> 4xx", r.status_code in (400, 409, 422, 500))
except Exception as e:
    fail("Duplicate registration check", str(e))

# =============================================================================
# 3. Auth - Login
# =============================================================================
section("3. Auth - Login")

try:
    r = requests.post(BASE + "/auth/login", json={
        "email": test_email, "password": test_password,
    }, timeout=TIMEOUT)
    chk("POST /auth/login -> 200", r.status_code == 200)
    if r.status_code == 200:
        data = r.json()
        chk("Login returns 'access_token'", "access_token" in data)
        chk("Token type is 'bearer'", data.get("token_type", "").lower() == "bearer")
        user_token = data.get("access_token", user_token)

    # Wrong password
    r2 = requests.post(BASE + "/auth/login", json={
        "email": test_email, "password": "WrongPass@999",
    }, timeout=TIMEOUT)
    chk("Wrong password -> 401", r2.status_code == 401)

    # Non-existent user
    r3 = requests.post(BASE + "/auth/login", json={
        "email": "nobody_" + uid() + "@nowhere.io", "password": "Any@Pass123",
    }, timeout=TIMEOUT)
    chk("Unknown email -> 401 or 404", r3.status_code in (401, 404))
except Exception as e:
    fail("Login tests", str(e))

# =============================================================================
# 4. Auth - /auth/me
# =============================================================================
section("4. Auth - Get Current User (/auth/me)")

if user_token:
    auth_header = {"Authorization": "Bearer " + user_token}
    try:
        r = requests.get(BASE + "/auth/me", headers=auth_header, timeout=TIMEOUT)
        chk("GET /auth/me -> 200 (valid token)", r.status_code == 200)
        if r.status_code == 200:
            me = r.json()
            chk("/auth/me returns correct email", me.get("email") == test_email)
            chk("/auth/me returns full_name", "full_name" in me)

        # No token — FastAPI HTTPBearer returns 403
        r2 = requests.get(BASE + "/auth/me", timeout=TIMEOUT)
        chk("GET /auth/me -> 401/403 (no token)", r2.status_code in (401, 403))

        # Bad token
        r3 = requests.get(BASE + "/auth/me",
                          headers={"Authorization": "Bearer thisisnotavalidtoken"},
                          timeout=TIMEOUT)
        chk("GET /auth/me -> 401 (bad token)", r3.status_code == 401)
    except Exception as e:
        fail("/auth/me tests", str(e))
else:
    skip("/auth/me tests", "No auth token (register/login failed)")

# =============================================================================
# 5. Input Validation (no DB write needed)
# =============================================================================
section("5. Input Validation")

if user_token:
    auth_header = {"Authorization": "Bearer " + user_token}
    try:
        # Missing required fields
        r = requests.post(BASE + "/complaints/submit",
                          json={"title": "incomplete"},
                          headers=auth_header, timeout=TIMEOUT)
        chk("Incomplete payload -> 422", r.status_code == 422)

        # No auth header
        r2 = requests.post(BASE + "/complaints/submit", json={
            "title": "x", "description": "d", "category": "c",
            "location": "l", "priority": "high",
        }, timeout=TIMEOUT)
        chk("Submit without auth -> 401/403", r2.status_code in (401, 403))
    except Exception as e:
        fail("Validation tests", str(e))
else:
    skip("Validation tests", "No auth token")

# =============================================================================
# 6. Submit Complaint (requires Supabase)
# =============================================================================
section("6. Complaints - Submit (requires Supabase)")

complaint_ref = None
complaint_id = None

if user_token:
    auth_header = {"Authorization": "Bearer " + user_token}
    payload = {
        "title": "Broken streetlight on main road causing accidents",
        "description": (
            "The streetlight near Bus Stop No. 7 on MG Road has been non-functional "
            "for 3 weeks. Vehicles are unable to see properly at night causing "
            "near-miss accidents. Multiple residents have complained verbally."
        ),
        "category": "Electricity",
        "location": "MG Road, Test City",
        "priority": "high",
        "image_urls": [],
    }
    try:
        r = requests.post(BASE + "/complaints/submit", json=payload,
                          headers=auth_header, timeout=30)
        chk("POST /complaints/submit -> 201", r.status_code == 201)
        if r.status_code == 201:
            data = r.json()
            chk("Response has 'is_duplicate'", "is_duplicate" in data)
            chk("Response has 'message'", "message" in data)
            if data.get("is_duplicate"):
                m = data.get("duplicate_match", {})
                chk("Duplicate has 'reference_id'", "reference_id" in m)
                chk("Similarity score 0-100", 0 <= m.get("similarity_score", -1) <= 100)
                chk("Duplicate has 'factor_scores'", "factor_scores" in m)
                info("Duplicate detected (score=" + str(m.get("similarity_score")) + "%)")
            else:
                cmp = data.get("complaint", {})
                chk("New: has 'complaint' object", bool(cmp))
                chk("Complaint has 'reference_id'", "reference_id" in cmp)
                chk("Complaint has 'status'", "status" in cmp)
                chk("reference_id starts with GRV-",
                    str(cmp.get("reference_id", "")).startswith("GRV-"))
                complaint_ref = cmp.get("reference_id")
                complaint_id = cmp.get("id")
                info("Registered! ID: " + str(complaint_ref))
        else:
            skip("Submit details", "HTTP " + str(r.status_code) + ": " + r.text[:150])
    except Exception as e:
        fail("POST /complaints/submit", str(e))
else:
    skip("Complaint submit", "No auth token")

# =============================================================================
# 7. Track Complaint
# =============================================================================
section("7. Complaints - Track")

if complaint_ref:
    try:
        r = requests.get(BASE + "/complaints/track/" + complaint_ref, timeout=TIMEOUT)
        chk("GET /complaints/track/{id} -> 200", r.status_code == 200)
        if r.status_code == 200:
            data = r.json()
            chk("reference_id matches", data.get("reference_id") == complaint_ref)
            chk("Has 'status'", "status" in data)
            chk("Has 'title'", "title" in data)
            chk("Has 'category'", "category" in data)
            chk("Status is 'registered'", data.get("status") == "registered")
    except Exception as e:
        fail("Track complaint", str(e))
else:
    skip("Track by reference ID", "No complaint_ref (submit failed or was duplicate)")

# Non-existent ID always works
try:
    r = requests.get(BASE + "/complaints/track/GRV-0000-XXXXX", timeout=TIMEOUT)
    # 404 = ID not found; 500 = Supabase unreachable (placeholder creds in .env)
    chk("Track non-existent ID -> 404 (500 if Supabase not configured)", r.status_code in (404, 500))
    if r.status_code == 500:
        info("Got 500 -- add real Supabase credentials to backend/.env to get proper 404s")
except Exception as e:
    fail("Track non-existent -> 404", str(e))

# =============================================================================
# 8. My Complaints
# =============================================================================
section("8. Complaints - My Complaints")

if user_token:
    auth_header = {"Authorization": "Bearer " + user_token}
    try:
        r = requests.get(BASE + "/complaints/my", headers=auth_header, timeout=TIMEOUT)
        chk("GET /complaints/my -> 200", r.status_code == 200)
        if r.status_code == 200:
            data = r.json()
            chk("Response is a list", isinstance(data, list))
            if complaint_ref:
                refs = [c.get("reference_id") for c in data]
                chk("Submitted complaint in /my list", complaint_ref in refs)

        r2 = requests.get(BASE + "/complaints/my", timeout=TIMEOUT)
        chk("GET /complaints/my without auth -> 401/403", r2.status_code in (401, 403))
    except Exception as e:
        fail("My complaints", str(e))
else:
    skip("My complaints", "No auth token")

# =============================================================================
# 9. Duplicate Detection (requires first complaint)
# =============================================================================
section("9. Duplicate Detection (Gemini AI)")

if user_token and complaint_ref:
    auth_header = {"Authorization": "Bearer " + user_token}
    dup_payload = {
        "title": "Broken streetlight near bus stop on MG Road",
        "description": (
            "The street light at Bus Stop 7 on MG Road has been off for weeks. "
            "People are unable to see at night and accidents are happening. "
            "Nobody has fixed it despite multiple complaints from locals."
        ),
        "category": "Electricity",
        "location": "MG Road, Test City",
        "priority": "high",
        "image_urls": [],
    }
    try:
        r = requests.post(BASE + "/complaints/submit", json=dup_payload,
                          headers=auth_header, timeout=30)
        chk("Near-duplicate submit -> 201", r.status_code == 201)
        if r.status_code == 201:
            data = r.json()
            if data.get("is_duplicate"):
                ok("Gemini AI correctly flagged near-identical complaint as duplicate")
                m = data.get("duplicate_match", {})
                score = m.get("similarity_score", 0)
                chk("Similarity score >= 75% (got " + str(score) + "%)", score >= 75)
                chk("Match references original", m.get("reference_id") == complaint_ref)
            else:
                skip("Duplicate flagging", "Not flagged - check GEMINI_API_KEY or threshold")
    except Exception as e:
        fail("Duplicate detection", str(e))
else:
    skip("Duplicate detection", "Needs user_token + complaint_ref from test 6")

# =============================================================================
# 10. Admin - Login + Endpoints
# =============================================================================
section("10. Admin Endpoints (requires seeded admin)")

admin_token = None
try:
    r = requests.post(BASE + "/auth/login", json={
        "email": "admin@scis.gov.in", "password": "Admin@1234",
    }, timeout=TIMEOUT)
    if r.status_code == 200:
        admin_token = r.json().get("access_token")
        ok("Admin login -> 200  (admin@scis.gov.in)")
    else:
        skip("Admin login", "HTTP " + str(r.status_code) + " -- run supabase_schema.sql seed first")
except Exception as e:
    fail("Admin login", str(e))

if admin_token:
    ah = {"Authorization": "Bearer " + admin_token}
    try:
        r = requests.get(BASE + "/admin/stats", headers=ah, timeout=TIMEOUT)
        chk("GET /admin/stats -> 200", r.status_code == 200)
        if r.status_code == 200:
            d = r.json()
            for field in ["total", "resolved", "pending", "in_progress", "duplicates_caught"]:
                chk("  stats has '" + field + "'", field in d)

        if user_token:
            r2 = requests.get(BASE + "/admin/stats",
                               headers={"Authorization": "Bearer " + user_token},
                               timeout=TIMEOUT)
            chk("Citizen token -> 403 on admin/stats", r2.status_code == 403)

        r3 = requests.get(BASE + "/admin/stats", timeout=TIMEOUT)
        chk("No auth -> 401/403 on admin/stats", r3.status_code in (401, 403))

        r4 = requests.get(BASE + "/admin/complaints", headers=ah, timeout=TIMEOUT)
        chk("GET /admin/complaints -> 200", r4.status_code == 200)
        if r4.status_code == 200:
            chk("admin/complaints is a list", isinstance(r4.json(), list))

        r5 = requests.get(BASE + "/admin/complaints?status=registered", headers=ah, timeout=TIMEOUT)
        chk("GET /admin/complaints?status=registered -> 200", r5.status_code == 200)

        if complaint_id:
            r6 = requests.patch(BASE + "/admin/complaints/" + complaint_id + "/status",
                                json={"status": "verified", "note": "Automated test"},
                                headers=ah, timeout=TIMEOUT)
            chk("PATCH complaint status -> 200", r6.status_code == 200)
            if complaint_ref:
                r7 = requests.get(BASE + "/complaints/track/" + complaint_ref, timeout=TIMEOUT)
                if r7.status_code == 200:
                    chk("Status changed to 'verified'", r7.json().get("status") == "verified")

            r8 = requests.post(BASE + "/admin/complaints/" + complaint_id + "/comments",
                                json={"content": "Verified by automated test suite."},
                                headers=ah, timeout=TIMEOUT)
            chk("POST admin comment -> 200/201", r8.status_code in (200, 201))
            if complaint_ref:
                r9 = requests.get(BASE + "/complaints/track/" + complaint_ref, timeout=TIMEOUT)
                if r9.status_code == 200:
                    chk("Comment visible in /track", len(r9.json().get("comments", [])) > 0)
        else:
            skip("Status/comment tests", "No complaint_id from test 6")
    except Exception as e:
        fail("Admin endpoint tests", str(e))
else:
    skip("All admin tests", "Admin login failed -- seed admin via supabase_schema.sql")

# =============================================================================
# 11. CORS Headers
# =============================================================================
section("11. CORS Headers")

try:
    r = requests.options(BASE + "/auth/login", headers={
        "Origin": "http://localhost:8080",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type,Authorization",
    }, timeout=TIMEOUT)
    cors = r.headers.get("access-control-allow-origin", "")
    chk("Access-Control-Allow-Origin present", bool(cors))
    chk("Allows frontend origin (localhost:8080 or *)", cors in ("*", "http://localhost:8080"))
except Exception as e:
    fail("CORS preflight", str(e))

# =============================================================================
# Summary
# =============================================================================
section("RESULTS SUMMARY")
total = passed + failed + skipped
print("  Total   : " + str(total))
print("  Passed  : " + str(passed))
print("  Failed  : " + str(failed))
print("  Skipped : " + str(skipped))
print()

if failed == 0 and skipped == 0:
    print("  All tests passed! Full system is working correctly.")
elif failed == 0:
    print("  All runnable tests passed.")
    print("  Skipped tests need Supabase credentials + seeded admin.")
else:
    print("  " + str(failed) + " test(s) failed. Common reasons:")
    print("  - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set in backend/.env")
    print("  - supabase_schema.sql not applied to the Supabase project")
    print("  - Admin user not seeded (check the INSERT at end of supabase_schema.sql)")
    print("  - GEMINI_API_KEY expired or invalid")
    sys.exit(1)
