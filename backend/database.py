"""
Supabase client singleton — uses service-role key for server-side ops.
"""
from supabase import create_client, Client
from config import get_settings

_supabase_client: Client | None = None

def get_supabase() -> Client:
    global _supabase_client
    if _supabase_client is None:
        s = get_settings()
        _supabase_client = create_client(s.supabase_url, s.supabase_service_role_key)
    return _supabase_client
