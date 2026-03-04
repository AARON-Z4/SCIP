import os
from database import get_supabase
from auth import hash_password, verify_password

db = get_supabase()

# Check if admin exists
result = db.table("profiles").select("*").eq("email", "admin@scis.gov.in").execute()

if not result.data:
    print("❌ ERROR: Admin user does not exist in the database.")
    print("👉 You need to run the Supabase schema script to seed the admin user.")
else:
    user = result.data[0]
    print(f"✅ Admin found: {user['email']} (ID: {user['id']})")
    
    # Check password match
    is_valid = verify_password("Admin@1234", user["password_hash"])
    
    print(f"Password stored hash: {user['password_hash'][:15]}...")
    if is_valid:
        print("✅ Password matches the hash! The 401 error is coming from somewhere else.")
    else:
        print("❌ ERROR: Password DOES NOT MATCH the hash stored in the DB.")
        print("👉 Let's fix this heavily by overwriting the hash.")
