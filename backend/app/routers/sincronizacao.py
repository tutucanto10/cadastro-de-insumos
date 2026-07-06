"""
Endpoint para disparar manualmente a sincronização com a SharePoint List.

Em produção, isso normalmente seria chamado por um job agendado (Vercel
Cron, GitHub Actions, ou um scheduler simples tipo APScheduler rodando
junto com o backend — mesmo padrão usado no Payslip Auto). Por enquanto,
expomos como endpoint pra você poder testar sob demanda.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import obter_usuario_atual, UsuarioAtual
from app.core.database import get_db
from app.services.sharepoint_sync import sincronizar

router = APIRouter(prefix="/api/sincronizacao", tags=["sincronizacao"])


@router.post("/sharepoint")
def sincronizar_sharepoint(
    db: Session = Depends(get_db),
    _usuario: UsuarioAtual = Depends(obter_usuario_atual),
):
    resultado = sincronizar(db)
    return resultado
