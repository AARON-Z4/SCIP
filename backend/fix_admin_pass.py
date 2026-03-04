import os
from database import get_supabase
from auth import hash_password

db = get_supabase()
email = "admin@scis.gov.in"

print("1. Generating fresh bcrypt hash for 'Admin@1234'...")
new_hash = hash_password("Admin@1234")
print(f"Generated Hash: {new_hash}")

print("\n2. Updating Supabase profiles table...")
result = db.table("profiles").update({"password_hash": new_hash}).eq("email", email).execute()

if result.data:
    print(f"✅ Successfully updated password hash for {email}!")
else:
    print(f"❌ Failed to update password. Admin user might not exist.")
