"""
Endpoints REST do recurso Insumo (os cards do Kanban).
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import obter_usuario_atual, UsuarioAtual
from app.core.database import get_db
from app.models.insumo import Insumo, TipoLocal, ColunaKanban
from app.models.schemas import InsumoCriar, InsumoMudarColuna, InsumoMudarResponsavelChamado, InsumoResposta
from app.services.email_service import notificar_mudanca_coluna

router = APIRouter(prefix="/api/insumos", tags=["insumos"])


@router.get("", response_model=list[InsumoResposta])
def listar_insumos(
    tipo_local: Optional[TipoLocal] = None,
    busca: Optional[str] = None,
    db: Session = Depends(get_db),
    _usuario: UsuarioAtual = Depends(obter_usuario_atual),
):
    """
    Lista insumos, com filtro opcional por tipo_local (escritorio/obra)
    e busca textual livre (nome, obra, solicitante, aplicação, id).
    """
    query = db.query(Insumo)

    if tipo_local:
        query = query.filter(Insumo.tipo_local == tipo_local)

    insumos = query.order_by(Insumo.criado_em.desc()).all()

    if busca:
        termo = busca.strip().lower()
        insumos = [
            i
            for i in insumos
            if termo
            in " ".join(
                [
                    i.nome_insumo,
                    i.local_exibicao,
                    i.solicitante_nome,
                    i.aplicacao,
                    i.id,
                ]
            ).lower()
        ]

    return insumos


@router.post("", response_model=InsumoResposta, status_code=201)
def criar_insumo(
    dados: InsumoCriar,
    db: Session = Depends(get_db),
    _usuario: UsuarioAtual = Depends(obter_usuario_atual),
):
    novo = Insumo(
        nome_insumo=dados.nome_insumo,
        unidade_medida=dados.unidade_medida,
        tipo_local=dados.tipo_local,
        obra=dados.obra,
        detalhes=dados.detalhes,
        marca=dados.marca,
        aplicacao=dados.aplicacao,
        solicitante_nome=dados.solicitante_nome,
        solicitante_email=dados.solicitante_email,
        data_solicitacao=dados.data_solicitacao,
        responsavel_chamado=dados.responsavel_chamado,
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo


@router.patch("/{insumo_id}/coluna", response_model=InsumoResposta)
def mudar_coluna(
    insumo_id: str,
    dados: InsumoMudarColuna,
    db: Session = Depends(get_db),
    usuario: UsuarioAtual = Depends(obter_usuario_atual),
):
    """
    Move um card entre colunas do Kanban. Dispara automaticamente um email
    de notificação pro solicitante (ver services/email_service.py).

    Ao entrar em "Em Andamento", o usuário logado que fez a mudança vira
    o responsável do card automaticamente.
    """
    insumo = db.query(Insumo).filter(Insumo.id == insumo_id).first()
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo não encontrado.")

    coluna_anterior = insumo.coluna

    if coluna_anterior == dados.coluna:
        return insumo  # sem mudança real, não dispara email duplicado

    insumo.coluna = dados.coluna

    if dados.coluna == ColunaKanban.EM_ANDAMENTO:
        insumo.responsavel_nome = usuario.nome
        insumo.responsavel_email = usuario.email

    if dados.coluna == ColunaKanban.CANCELADO:
        insumo.motivo_cancelamento = dados.motivo_cancelamento

    db.commit()
    db.refresh(insumo)

    notificar_mudanca_coluna(db, insumo, coluna_anterior, dados.coluna)

    return insumo


@router.patch("/{insumo_id}/responsavel-chamado", response_model=InsumoResposta)
def mudar_responsavel_chamado(
    insumo_id: str,
    dados: InsumoMudarResponsavelChamado,
    db: Session = Depends(get_db),
    _usuario: UsuarioAtual = Depends(obter_usuario_atual),
):
    """
    Edita o responsável pelo chamado (controle interno) — editável a
    qualquer momento, diferente do `responsavel_nome` automático.
    """
    insumo = db.query(Insumo).filter(Insumo.id == insumo_id).first()
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo não encontrado.")

    insumo.responsavel_chamado = dados.responsavel_chamado
    db.commit()
    db.refresh(insumo)
    return insumo


@router.delete("/{insumo_id}", status_code=204)
def excluir_insumo(
    insumo_id: str,
    db: Session = Depends(get_db),
    _usuario: UsuarioAtual = Depends(obter_usuario_atual),
):
    insumo = db.query(Insumo).filter(Insumo.id == insumo_id).first()
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo não encontrado.")
    db.delete(insumo)
    db.commit()
    return None
