import os
import json
import urllib.request
from datetime import datetime, timedelta, timezone
from jose import jwt

# Extract from .env
JWT_SECRET="726787d8cad406b703e200ba7b7ec1c669bd7054040b9681c29c13a0927ce0bd"
ALGORITHM="HS256"

# Create token for admin
payload = {
    "sub": "8bc999d9-e311-488a-b1ae-f2782a20b8f4", # Admin ID
    "role": "admin",
    "exp": datetime.now(timezone.utc) + timedelta(minutes=60)
}
token = jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

data = json.dumps({
    "title": "This is a dummy test title for AI.",
    "description": "This is a dummy test description that is long enough to bypass validation. Testing the AI duplicate checking pipeline to see if 503 persists.",
    "category": "Others",
    "location": "Test Loc",
    "priority": "low"
}).encode('utf-8')

req = urllib.request.Request(
    "https://scip-production.up.railway.app/complaints/submit",
    data=data,
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
)

try:
    with urllib.request.urlopen(req) as response:
        result = response.read()
        print("Success:", result.decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code} {e.reason}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
