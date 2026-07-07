"""
Camada de autenticação.

MOCK_MODE=True (dev): não existe login Microsoft de verdade. O frontend
manda quem é o "usuário logado" via headers simples (X-User-Name,
X-User-Email), simulando o que viria de um token MSAL decodificado.

MOCK_MODE=False: o frontend loga de verdade via MSAL (login popup) e manda
o ID token no header `Authorization: Bearer <token>`. Aqui validamos a
assinatura desse token contra as chaves públicas do Azure AD (JWKS do
tenant) e extraímos `name`/`preferred_username` — o resto do código
(routers, services) não muda nada, porque todos dependem só do contrato
UsuarioAtual abaixo.
"""

from dataclasses import dataclass

import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient

from app.core.config import MOCK_MODE, AZURE_TENANT_ID, AZURE_CLIENT_ID


@dataclass
class UsuarioAtual:
    nome: str
    email: str


_jwks_client: PyJWKClient | None = None


def _obter_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(
            f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/discovery/v2.0/keys"
        )
    return _jwks_client


def _validar_token_azure(token: str) -> UsuarioAtual:
    try:
        chave = _obter_jwks_client().get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            chave,
            algorithms=["RS256"],
            audience=AZURE_CLIENT_ID,
            issuer=f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/v2.0",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail=f"Token inválido: {exc}") from exc

    email = claims.get("preferred_username") or claims.get("email") or ""
    if not email:
        raise HTTPException(status_code=401, detail="Token não contém o email do usuário.")

    return UsuarioAtual(nome=claims.get("name", email), email=email)


def obter_usuario_atual(
    authorization: str = Header(default=None),
    x_user_name: str = Header(default=None),
    x_user_email: str = Header(default=None),
) -> UsuarioAtual:
    if MOCK_MODE:
        if not x_user_name or not x_user_email:
            raise HTTPException(
                status_code=401,
                detail="Headers X-User-Name e X-User-Email são obrigatórios em modo mock "
                "(simulam o que viria do login Microsoft).",
            )
        return UsuarioAtual(nome=x_user_name, email=x_user_email)

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Header 'Authorization: Bearer <token>' é obrigatório.",
        )

    token = authorization.removeprefix("Bearer ").strip()
    return _validar_token_azure(token)
