"""
Modelo principal: Insumo.

Representa um item cadastrado, seja vindo do nosso próprio formulário (login
Microsoft) ou sincronizado da SharePoint List via polling. O campo
`origem` distingue as duas procedências.
"""

import enum
import uuid

from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, Text
from sqlalchemy.sql import func

from app.core.database import Base


class TipoLocal(str, enum.Enum):
    ESCRITORIO = "escritorio"
    OBRA = "obra"


class ColunaKanban(str, enum.Enum):
    A_FAZER = "a-fazer"
    EM_ANDAMENTO = "em-andamento"
    CONCLUIDO = "concluido"
    CANCELADO = "cancelado"


class OrigemInsumo(str, enum.Enum):
    APP = "app"  # cadastrado direto no nosso sistema
    SHAREPOINT = "sharepoint"  # importado via polling da SharePoint List


class ResponsavelChamado(str, enum.Enum):
    """Escolhido na criação do chamado, pra controle interno. Independente
    do `responsavel_nome`/`responsavel_email`, que continuam preenchidos
    automaticamente por quem move o card pra 'Em Andamento'."""

    LUCAS_QUEIROZ = "Lucas Queiroz"
    MARIO_CESAR_GUEDES = "Mário César Guedes"


def gerar_id():
    return f"INS-{uuid.uuid4().hex[:8].upper()}"


class Insumo(Base):
    __tablename__ = "insumos"

    id = Column(String, primary_key=True, default=gerar_id)

    nome_insumo = Column(String, nullable=False)
    unidade_medida = Column(String, nullable=False)

    tipo_local = Column(SQLEnum(TipoLocal), nullable=False)
    obra = Column(String, nullable=True)  # preenchido só quando tipo_local == OBRA

    detalhes = Column(Text, nullable=False)
    marca = Column(String, nullable=True)
    aplicacao = Column(String, nullable=False)

    solicitante_nome = Column(String, nullable=False)
    solicitante_email = Column(String, nullable=False)

    # Preenchido automaticamente com quem estava logado ao mover o card
    # para "Em Andamento" (ver routers/insumos.py -> mudar_coluna).
    responsavel_nome = Column(String, nullable=True)
    responsavel_email = Column(String, nullable=True)

    # Escolhido manualmente na criação do chamado (controle interno).
    # Nulo pra itens importados da SharePoint List, que não têm esse campo.
    responsavel_chamado = Column(SQLEnum(ResponsavelChamado), nullable=True)

    data_solicitacao = Column(String, nullable=False)  # formato ISO yyyy-mm-dd

    coluna = Column(
        SQLEnum(ColunaKanban), nullable=False, default=ColunaKanban.A_FAZER
    )

    origem = Column(SQLEnum(OrigemInsumo), nullable=False, default=OrigemInsumo.APP)
    sharepoint_item_id = Column(String, nullable=True, unique=True)  # dedupe no polling

    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    @property
    def local_exibicao(self) -> str:
        """Texto pronto pra exibir no card: 'Escritório/Stand' ou o nome da obra."""
        if self.tipo_local == TipoLocal.ESCRITORIO:
            return "Escritório/Stand"
        return self.obra or "Obra não especificada"
