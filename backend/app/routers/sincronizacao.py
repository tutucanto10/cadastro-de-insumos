"""
Endpoint para disparar a sincronização com a SharePoint List.

Chamado periodicamente pelo GitHub Actions (.github/workflows/sync-sharepoint.yml)
— não depende do login de usuário, já que é uma chamada sistema-a-sistema.
Autentica via SYNC_API_KEY (header X-Sync-Key), separado do login MSAL.
"""

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.config import SYNC_API_KEY
from app.core.database import get_db
from app.services.sharepoint_sync import sincronizar

router = APIRouter(prefix="/api/sincronizacao", tags=["sincronizacao"])


def verificar_chave_sincronizacao(x_sync_key: str = Header(default=None)):
    if not SYNC_API_KEY:
        raise HTTPException(
            status_code=501,
            detail="SYNC_API_KEY não configurado no backend.",
        )
    if x_sync_key != SYNC_API_KEY:
        raise HTTPException(status_code=401, detail="X-Sync-Key inválido ou ausente.")


@router.post("/sharepoint")
def sincronizar_sharepoint(
    db: Session = Depends(get_db),
    _chave: None = Depends(verificar_chave_sincronizacao),
):
    resultado = sincronizar(db)
    return resultado
