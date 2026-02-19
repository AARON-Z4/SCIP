"""
Supabase client singleton — uses service-role key for server-side ops.
"""
from supabase import create_client, Client
from config import get_settings
from functools import lru_cache


@lru_cache()
def get_supabase() -> Client:
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_service_role_key)
