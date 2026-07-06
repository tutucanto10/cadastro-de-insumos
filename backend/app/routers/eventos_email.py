"""
Endpoint de consulta ao histórico de emails disparados — útil pra
auditoria ("esse solicitante foi avisado mesmo?") sem precisar abrir o
Outlook.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import obter_usuario_atual, UsuarioAtual
from app.core.database import get_db
from app.models.evento_email import EventoEmail
from app.models.schemas import EventoEmailResposta

router = APIRouter(prefix="/api/eventos-email", tags=["eventos-email"])


@router.get("", response_model=list[EventoEmailResposta])
def listar_eventos_email(
    insumo_id: str | None = None,
    db: Session = Depends(get_db),
    _usuario: UsuarioAtual = Depends(obter_usuario_atual),
):
    query = db.query(EventoEmail)
    if insumo_id:
        query = query.filter(EventoEmail.insumo_id == insumo_id)
    return query.order_by(EventoEmail.criado_em.desc()).all()
