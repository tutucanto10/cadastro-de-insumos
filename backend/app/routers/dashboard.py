"""
Endpoint de números agregados por obra (ou por Escritório/Stand), pro
botão "Dashboards" do frontend — apresentação em reunião do time de
atendimento, não é só contagem: mostra backlog atual, o que está
parado há mais tempo e carga por responsável, além do volume
concluído/cancelado no período.
"""

from datetime import datetime, timedelta, timezone
from statistics import mean
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth import obter_usuario_atual, UsuarioAtual
from app.core.database import get_db
from app.core.dias_uteis import tz_aware
from app.models.evento_email import EventoEmail
from app.models.insumo import ColunaKanban, Insumo, TipoLocal
from app.models.schemas import DashboardLocalItem, DashboardObraResposta

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

ABERTOS = (ColunaKanban.A_FAZER, ColunaKanban.EM_ANDAMENTO)

MESES_ABREV = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
]


def _escopo_obra(db: Session, obra: str):
    # case-insensitive: mesmo motivo do filtro em GET /api/insumos —
    # grafia varia entre o que vem do SharePoint e o formulário do app.
    return db.query(Insumo).filter(
        Insumo.tipo_local == TipoLocal.OBRA,
        func.lower(Insumo.obra) == obra.strip().lower(),
    )


def _escopo_escritorio(db: Session):
    return db.query(Insumo).filter(Insumo.tipo_local == TipoLocal.ESCRITORIO)


def _escopo_escritorio_local(db: Session, local: str):
    return db.query(Insumo).filter(
        Insumo.tipo_local == TipoLocal.ESCRITORIO,
        func.lower(Insumo.obra) == local.strip().lower(),
    )


def _bucket_chave(dt: datetime, dias: Optional[int]):
    """
    Agrupa uma data num "balde" pro gráfico de volume, escolhendo a
    granularidade pelo tamanho do período — pra não virar um gráfico de
    365 barrinhas quando o período é "Tudo", nem um de 1 barra só quando
    é "7 dias": até 7 dias agrupa por dia, até 30 por semana, do
    contrário por mês.
    """
    if dias is not None and dias <= 7:
        return dt.date()
    if dias is not None and dias <= 30:
        return dt.date() - timedelta(days=dt.weekday())
    return dt.date().replace(day=1)


def _bucket_rotulo(chave, dias: Optional[int]) -> str:
    if dias is not None and dias <= 7:
        return chave.strftime("%d/%m")
    if dias is not None and dias <= 30:
        return f"sem. {chave.strftime('%d/%m')}"
    return f"{MESES_ABREV[chave.month - 1]}/{chave.year}"


def _proximo_bucket(chave, dias: Optional[int]):
    if dias is not None and dias <= 7:
        return chave + timedelta(days=1)
    if dias is not None and dias <= 30:
        return chave + timedelta(days=7)
    # mês seguinte, sem depender de calendar.monthrange
    return (chave.replace(day=28) + timedelta(days=4)).replace(day=1)


def _calcular_periodo(
    db: Session,
    ids_todos: list[str],
    desde: Optional[datetime],
    ate: Optional[datetime],
) -> dict:
    """
    Concluídos/cancelados/tempo médio dentro de uma janela [desde, ate)
    — usado pro período atual (ate=None, sem limite superior) e pro
    período anterior de mesmo tamanho (comparação de delta).
    """
    query = db.query(EventoEmail, Insumo.criado_em).join(
        Insumo, Insumo.id == EventoEmail.insumo_id
    ).filter(
        EventoEmail.insumo_id.in_(ids_todos),
        EventoEmail.coluna_nova.in_(["concluido", "cancelado"]),
    )
    if desde:
        query = query.filter(EventoEmail.criado_em >= desde)
    if ate:
        query = query.filter(EventoEmail.criado_em < ate)

    concluidos = 0
    cancelados = 0
    primeira_conclusao = {}  # insumo_id -> menor duração (criado_em do insumo até o evento)
    for evento, insumo_criado_em in query.all():
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

    return {"concluidos": concluidos, "cancelados": cancelados, "tempo_medio_conclusao_dias": tempo_medio}


def _montar_dashboard(db: Session, escopo_query, titulo: str, dias: Optional[int]) -> dict:
    """
    Monta a resposta completa do dashboard a partir de uma query já
    filtrada pro escopo desejado (uma obra específica, ou todo o
    Escritório/Stand) — o resto da conta (backlog, período, tempo
    médio, mais antigos, carga, status atual, volume) é idêntico nos
    dois casos.
    """
    abertos = escopo_query.filter(Insumo.coluna.in_(ABERTOS)).all()
    a_fazer = sum(1 for i in abertos if i.coluna == ColunaKanban.A_FAZER)
    em_andamento = sum(1 for i in abertos if i.coluna == ColunaKanban.EM_ANDAMENTO)

    todos_do_escopo = escopo_query.all()
    ids_todos = [i.id for i in todos_do_escopo]

    agora = datetime.now(timezone.utc)
    desde_atual = agora - timedelta(days=dias) if dias else None
    periodo_atual = _calcular_periodo(db, ids_todos, desde_atual, None)
    concluidos = periodo_atual["concluidos"]
    cancelados = periodo_atual["cancelados"]
    tempo_medio = periodo_atual["tempo_medio_conclusao_dias"]

    periodo_anterior = None
    if dias:
        periodo_anterior = _calcular_periodo(
            db, ids_todos, agora - timedelta(days=2 * dias), agora - timedelta(days=dias)
        )

    mais_antigos = sorted(abertos, key=lambda i: i.criado_em)[:5]

    carga = {}
    for i in abertos:
        chave = i.responsavel_chamado.value if i.responsavel_chamado else "Não atribuído"
        carga[chave] = carga.get(chave, 0) + 1

    contagem_status = {c: 0 for c in ColunaKanban}
    for i in todos_do_escopo:
        contagem_status[i.coluna] += 1
    status_atual = [{"coluna": c, "total": contagem_status[c]} for c in ColunaKanban]

    desde_volume = datetime.now(timezone.utc) - timedelta(days=dias) if dias else None
    candidatos_volume = [
        i for i in todos_do_escopo
        if i.criado_em and (desde_volume is None or tz_aware(i.criado_em) >= desde_volume)
    ]

    contagem_volume = {}
    for i in candidatos_volume:
        chave = _bucket_chave(i.criado_em, dias)
        contagem_volume[chave] = contagem_volume.get(chave, 0) + 1

    volume_periodo = []
    if contagem_volume:
        inicio = _bucket_chave(desde_volume, dias) if desde_volume else min(contagem_volume)
        fim = _bucket_chave(datetime.now(timezone.utc), dias)
        chave_atual = inicio
        while chave_atual <= fim:
            volume_periodo.append(
                {"rotulo": _bucket_rotulo(chave_atual, dias), "total": contagem_volume.get(chave_atual, 0)}
            )
            chave_atual = _proximo_bucket(chave_atual, dias)

    return {
        "titulo": titulo,
        "periodo_dias": dias,
        "em_aberto": {"a_fazer": a_fazer, "em_andamento": em_andamento, "total": len(abertos)},
        "periodo": {"concluidos": concluidos, "cancelados": cancelados},
        "tempo_medio_conclusao_dias": tempo_medio,
        "periodo_anterior": periodo_anterior,
        "mais_antigos_abertos": [
            {
                "id": i.id,
                "nome_insumo": i.nome_insumo,
                "coluna": i.coluna,
                "criado_em": i.criado_em,
                "atrasado": i.atrasado,
            }
            for i in mais_antigos
        ],
        "carga_responsavel": [
            {"responsavel": responsavel, "total": total} for responsavel, total in carga.items()
        ],
        "status_atual": status_atual,
        "volume_periodo": volume_periodo,
    }


@router.get("/obras/{obra}", response_model=DashboardObraResposta)
def dashboard_obra(
    obra: str,
    dias: Optional[int] = Query(default=None, ge=1),
    db: Session = Depends(get_db),
    _usuario: UsuarioAtual = Depends(obter_usuario_atual),
):
    return _montar_dashboard(db, _escopo_obra(db, obra), obra, dias)


@router.get("/escritorio", response_model=DashboardObraResposta)
def dashboard_escritorio(
    dias: Optional[int] = Query(default=None, ge=1),
    db: Session = Depends(get_db),
    _usuario: UsuarioAtual = Depends(obter_usuario_atual),
):
    return _montar_dashboard(db, _escopo_escritorio(db), "Escritório/Stand", dias)


@router.get("/escritorio/locais", response_model=list[DashboardLocalItem])
def listar_locais_escritorio(
    db: Session = Depends(get_db),
    _usuario: UsuarioAtual = Depends(obter_usuario_atual),
):
    """
    Lista os centros de custo/stands com chamados (o campo "Obra(s)" do
    SharePoint, guardado mesmo pra itens de escritório) — busca direto
    do banco em vez de uma lista fixa, porque a grafia varia
    (ex.: "Stand - Primavera" vs "Stand de Vendas - São Gonçalo") e uma
    lista curada manualmente ia fragmentar em entradas duplicadas.
    """
    contagem = {}
    for i in _escopo_escritorio(db).all():
        if not i.obra:
            continue
        contagem[i.obra] = contagem.get(i.obra, 0) + 1
    return sorted(
        [{"local": local, "total": total} for local, total in contagem.items()],
        key=lambda item: -item["total"],
    )


@router.get("/escritorio/local/{local}", response_model=DashboardObraResposta)
def dashboard_escritorio_local(
    local: str,
    dias: Optional[int] = Query(default=None, ge=1),
    db: Session = Depends(get_db),
    _usuario: UsuarioAtual = Depends(obter_usuario_atual),
):
    return _montar_dashboard(db, _escopo_escritorio_local(db, local), local, dias)
