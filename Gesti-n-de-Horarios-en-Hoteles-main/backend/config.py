"""
config.py — Variables de entorno y cliente Supabase
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL: str = os.environ.get(
    "SUPABASE_URL",
    "https://ugmmdnyvcbsjbviizpym.supabase.co"
)
SUPABASE_SERVICE_KEY: str = os.environ.get(
    "SUPABASE_SERVICE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnbW1kbnl2Y2JzamJ2aWl6cHltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc5NjU0MiwiZXhwIjoyMDkyMzcyNTQyfQ.bXLbiGtGQdUMq-Vt8FrgchMbPLLpjJ6pIz9h_GbvB6w"
)
SUPABASE_ANON_KEY: str = os.environ.get(
    "SUPABASE_ANON_KEY",
    "sb_publishable_ekgGNLZVicRBxyTyK3QRGg_0mX8yXv1"
)
JWT_SECRET: str = os.environ.get("JWT_SECRET", "hotel_palmares_jwt_secret_change_in_prod")

# Cliente con service_role (acceso total — usar solo en el backend)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)