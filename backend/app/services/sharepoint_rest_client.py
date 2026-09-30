"""
Cliente pra API REST clássica do SharePoint (`_api/web/...`) — usada só
pra baixar o conteúdo de anexos de item da SharePoint List, que a
Microsoft Graph não expõe (só tem esse endpoint na API antiga).

Autenticação separada da Graph API (graph_client.py): a API REST do
SharePoint recusa token de aplicação do Azure AD gerado com client
secret ("Unsupported app only token") — só aceita client assertion
assinada com certificado. Ver SHAREPOINT_CERT_* em core/config.py.
"""

import base64
import time
import uuid
from urllib.parse import quote

import jwt
import requests

from app.core.config import (
    AZURE_TENANT_ID,
    AZURE_CLIENT_ID,
    SHAREPOINT_CERT_PRIVATE_KEY,
    SHAREPOINT_CERT_THUMBPRINT,
)
from app.services.sharepoint_sync import SITE_WEB_URL, LISTA_NOME_URL

CREDENCIAIS_CONFIGURADAS = bool(
    AZURE_TENANT_ID and AZURE_CLIENT_ID and SHAREPOINT_CERT_PRIVATE_KEY and SHAREPOINT_CERT_THUMBPRINT
)

_SHAREPOINT_RESOURCE = f"https://{SITE_WEB_URL.split('/')[2]}"  # "https://dommainc.sharepoint.com"


def _diagnosticar_thumbprint(valor: str) -> str:
    """
    bytes.fromhex() só diz "non-hexadecimal number found... at position N",
    sem dizer qual caractere é nem o tamanho da string — isso aqui monta um
    diagnóstico completo (tamanho, caracteres inválidos e posição) sem
    vazar segredo nenhum: o thumbprint não é sensível, é só a impressão
    digital pública do certificado.
    """
    invalidos = [(i, c) for i, c in enumerate(valor) if c.lower() not in "0123456789abcdef"]
    partes = [f"tamanho={len(valor)} (esperado 40)"]
    if invalidos:
        partes.append(
            "caracteres inválidos: "
            + ", ".join(f"posição {i}={c!r} (0x{ord(c):02x})" for i, c in invalidos[:5])
        )
    return "; ".join(partes)


def _obter_token() -> str:
    if len(SHAREPOINT_CERT_THUMBPRINT) != 40 or any(
        c.lower() not in "0123456789abcdef" for c in SHAREPOINT_CERT_THUMBPRINT
    ):
        raise ValueError(
            f"SHAREPOINT_CERT_THUMBPRINT inválido — {_diagnosticar_thumbprint(SHAREPOINT_CERT_THUMBPRINT)}"
        )
    token_endpoint = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/token"
    x5t = base64.urlsafe_b64encode(bytes.fromhex(SHAREPOINT_CERT_THUMBPRINT)).decode().rstrip("=")
    agora = int(time.time())
    assertion = jwt.encode(
        {
            "aud": token_endpoint,
            "iss": AZURE_CLIENT_ID,
            "sub": AZURE_CLIENT_ID,
            "jti": str(uuid.uuid4()),
            "nbf": agora,
            "exp": agora + 300,
        },
        SHAREPOINT_CERT_PRIVATE_KEY,
        algorithm="RS256",
        headers={"x5t": x5t},
    )
    resp = requests.post(
        token_endpoint,
        data={
            "client_id": AZURE_CLIENT_ID,
            "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            "client_assertion": assertion,
            "grant_type": "client_credentials",
            "scope": f"{_SHAREPOINT_RESOURCE}/.default",
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def listar_anexos(sharepoint_item_id: str) -> list[dict]:
    token = _obter_token()
    url = (
        f"{SITE_WEB_URL}/_api/web/lists/getbytitle('{LISTA_NOME_URL}')"
        f"/items({sharepoint_item_id})/AttachmentFiles"
    )
    resp = requests.get(
        url,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json;odata=verbose"},
        timeout=15,
    )
    resp.raise_for_status()
    itens = resp.json().get("d", {}).get("results", [])
    return [{"nome": item["FileName"]} for item in itens]


def baixar_anexo(sharepoint_item_id: str, nome_arquivo: str) -> tuple[bytes, str]:
    token = _obter_token()
    url = (
        f"{SITE_WEB_URL}/_api/web/lists/getbytitle('{LISTA_NOME_URL}')"
        f"/items({sharepoint_item_id})/AttachmentFiles('{quote(nome_arquivo)}')/$value"
    )
    resp = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    resp.raise_for_status()
    content_type = resp.headers.get("Content-Type") or "application/octet-stream"
    return resp.content, content_type
