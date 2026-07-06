"""
Camada de autenticação.

MODO ATUAL (MOCK_MODE=True): não existe login Microsoft de verdade ainda.
O frontend manda quem é o "usuário logado" via headers simples
(X-User-Name, X-User-Email), simulando o que viria de um token MSAL
decodificado.

QUANDO INTEGRARMOS COM AZURE AD DE VERDADE:
Esta função `obter_usuario_atual` é o único lugar que precisa mudar.
Em vez de ler headers, ela vai:
  1. Pegar o token Bearer do header Authorization
  2. Validar a assinatura contra as chaves públicas do Azure AD (tenant)
  3. Extrair `name` e `preferred_username` (email) do token validado
O resto do código (routers, services) não muda nada, porque todos
dependem só do contrato UsuarioAtual abaixo.
"""

from dataclasses import dataclass

from fastapi import Header, HTTPException

from app.core.config import MOCK_MODE


@dataclass
class UsuarioAtual:
    nome: str
    email: str


def obter_usuario_atual(
    x_user_name: str = Header(default=None),
    x_user_email: str = Header(default=None),
) -> UsuarioAtual:
    if not MOCK_MODE:
        # Ponto de extensão: aqui entra a validação real do token Azure AD
        # quando integrarmos. Por ora, MOCK_MODE sempre será True até a
        # integração ser feita — ver core/config.py.
        raise HTTPException(
            status_code=501,
            detail="Autenticação Azure AD ainda não implementada. "
            "Defina MOCK_MODE=true para usar o modo de desenvolvimento.",
        )

    if not x_user_name or not x_user_email:
        raise HTTPException(
            status_code=401,
            detail="Headers X-User-Name e X-User-Email são obrigatórios em modo mock "
            "(simulam o que viria do login Microsoft).",
        )

    return UsuarioAtual(nome=x_user_name, email=x_user_email)
