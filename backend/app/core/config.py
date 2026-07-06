"""
Configurações centrais do backend.

Por enquanto lê de variáveis de ambiente com valores padrão sensatos pra
desenvolvimento local. Quando formos integrar com Azure AD de verdade,
as variáveis AZURE_* passam a ser obrigatórias (ver core/auth.py).
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Carrega o .env de dentro de backend/ (funciona independente de onde o
# uvicorn é chamado, e independente de flags como --env-file).
load_dotenv(BASE_DIR / ".env")

# --- Banco de dados ---
# Em dev: SQLite num arquivo local. Em produção: Postgres (ex.: Neon via
# Vercel), usando o driver psycopg (v3). O provedor costuma entregar a URL
# como "postgresql://..." — sem o "+psycopg", o SQLAlchemy tentaria usar
# psycopg2 (não instalado), então normalizamos aqui.
DATABASE_URL = os.getenv(
    "DATABASE_URL", f"sqlite:///{BASE_DIR / 'cadastro_insumos.db'}"
)
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# --- Azure AD / Microsoft Graph ---
# Usadas pela sincronização da SharePoint List (app-only, client credentials
# — ver services/sharepoint_sync.py). O login de usuário (MSAL) continua
# mockado independente disso, controlado só pelo MOCK_MODE abaixo.
AZURE_TENANT_ID = os.getenv("AZURE_TENANT_ID", "")
AZURE_CLIENT_ID = os.getenv("AZURE_CLIENT_ID", "")
AZURE_CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET", "")

# --- Resend (envio de email nas mudanças de coluna) ---
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")

# IDs da SharePoint List "Cadastro de Insumos"
SHAREPOINT_SITE_ID = os.getenv("SHAREPOINT_SITE_ID", "")
SHAREPOINT_LIST_ID = os.getenv("SHAREPOINT_LIST_ID", "")

# Corte de data (ISO, ex.: "2026-07-06T00:00:00Z") — só importa itens da
# SharePoint List criados depois disso, pra não trazer o histórico inteiro
# quando a sincronização real for ligada pela primeira vez.
SHAREPOINT_SYNC_DESDE = os.getenv("SHAREPOINT_SYNC_DESDE", "")

# --- Modo de simulação ---
# Controla só o login (MSAL) por enquanto — email (Resend) e sincronização
# SharePoint têm suas próprias condições, baseadas na presença das
# respectivas credenciais (ver email_service.py e sharepoint_sync.py).
MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() == "true"

# Intervalo do job de polling da SharePoint List, em segundos
POLLING_INTERVAL_SECONDS = int(os.getenv("POLLING_INTERVAL_SECONDS", "300"))

# CORS — origens permitidas a chamar a API (frontend local em dev)
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
).split(",")
