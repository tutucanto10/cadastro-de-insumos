"""
Endpoint de números agregados por obra, pro botão "Dashboards" do
frontend — apresentação em reunião do time de atendimento, não é só
contagem: mostra backlog atual, o que está parado há mais tempo e
carga por responsável, além do volume concluído/cancelado no período.
"""

from datetime import datetime, timedelta
from statistics import mean
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth import obter_usuario_atual, UsuarioAtual
from app.core.database import get_db
from app.models.evento_email import EventoEmail
from app.models.insumo import ColunaKanban, Insumo, TipoLocal
from app.models.schemas import DashboardObraResposta

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

ABERTOS = (ColunaKanban.A_FAZER, ColunaKanban.EM_ANDAMENTO)


def _query_obra(db: Session, obra: str):
    # case-insensitive: mesmo motivo do filtro em GET /api/insumos —
    # grafia varia entre o que vem do SharePoint e o formulário do app.
    return db.query(Insumo).filter(
        Insumo.tipo_local == TipoLocal.OBRA,
        func.lower(Insumo.obra) == obra.strip().lower(),
    )


@router.get("/obras/{obra}", response_model=DashboardObraResposta)
def dashboard_obra(
    obra: str,
    dias: Optional[int] = Query(default=None, ge=1),
    db: Session = Depends(get_db),
    _usuario: UsuarioAtual = Depends(obter_usuario_atual),
):
    abertos = _query_obra(db, obra).filter(Insumo.coluna.in_(ABERTOS)).all()
    a_fazer = sum(1 for i in abertos if i.coluna == ColunaKanban.A_FAZER)
    em_andamento = sum(1 for i in abertos if i.coluna == ColunaKanban.EM_ANDAMENTO)

    eventos_periodo_query = (
        db.query(EventoEmail, Insumo.criado_em)
        .join(Insumo, Insumo.id == EventoEmail.insumo_id)
        .filter(
            Insumo.tipo_local == TipoLocal.OBRA,
            func.lower(Insumo.obra) == obra.strip().lower(),
            EventoEmail.coluna_nova.in_(["concluido", "cancelado"]),
        )
    )
    if dias:
        eventos_periodo_query = eventos_periodo_query.filter(
            EventoEmail.criado_em >= datetime.utcnow() - timedelta(days=dias)
        )

    concluidos = 0
    cancelados = 0
    primeira_conclusao = {}  # insumo_id -> menor duração (criado_em do insumo até o evento)
    for evento, insumo_criado_em in eventos_periodo_query.all():
        if evento.coluna_nova == "concluido":
            concluidos += 1
            duracao = evento.criado_em - insumo_criado_em
            anterior = primeira_conclusao.get(evento.insumo_id)
            if anterior is None or duracao < anterior:
                primeira_conclusao[evento.insumo_id] = duracao
        else:
            cancelados += 1

    tempo_medio = None
    if primeira_conclusao:
        media_segundos = mean(d.total_seconds() for d in primeira_conclusao.values())
        tempo_medio = round(media_segundos / 86400, 1)

    mais_antigos = (
        _query_obra(db, obra)
        .filter(Insumo.coluna.in_(ABERTOS))
        .order_by(Insumo.criado_em.asc())
        .limit(5)
        .all()
    )

    carga = {}
    for i in abertos:
        chave = i.responsavel_chamado.value if i.responsavel_chamado else "Não atribuído"
        carga[chave] = carga.get(chave, 0) + 1

    return {
        "obra": obra,
        "periodo_dias": dias,
        "em_aberto": {"a_fazer": a_fazer, "em_andamento": em_andamento, "total": len(abertos)},
        "periodo": {"concluidos": concluidos, "cancelados": cancelados},
        "tempo_medio_conclusao_dias": tempo_medio,
        "mais_antigos_abertos": [
            {
                "id": i.id,
                "nome_insumo": i.nome_insumo,
                "coluna": i.coluna,
                "criado_em": i.criado_em,
            }
            for i in mais_antigos
        ],
        "carga_responsavel": [
            {"responsavel": responsavel, "total": total} for responsavel, total in carga.items()
        ],
    }
