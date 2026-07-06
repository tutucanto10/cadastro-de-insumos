"""
Autenticação compartilhada com o Microsoft Graph API (client credentials,
app-only — sem usuário logado). Usado tanto pela sincronização da
SharePoint List quanto pelo envio de email, que usam o mesmo App
Registration do Azure AD com permissões diferentes (Sites.Read.All e
Mail.Send).
"""

import requests

from app.core.config import AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET

GRAPH_BASE = "https://graph.microsoft.com/v1.0"


def obter_token_graph() -> str:
    """Autentica via client credentials e devolve um access token do Graph."""
    resp = requests.post(
        f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/token",
        data={
            "client_id": AZURE_CLIENT_ID,
            "client_secret": AZURE_CLIENT_SECRET,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials",
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]
