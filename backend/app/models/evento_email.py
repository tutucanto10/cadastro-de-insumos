"""
Modelo de auditoria: cada e-mail disparado fica registrado aqui.

Existe pra você (ou qualquer um do time) poder responder "esse solicitante
foi avisado mesmo?" sem depender de procurar na caixa de saída do Outlook.
"""

import uuid

from sqlalchemy import Column, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.sql import func

from app.core.database import Base


def gerar_id():
    return f"EMAIL-{uuid.uuid4().hex[:8].upper()}"


class EventoEmail(Base):
    __tablename__ = "eventos_email"

    id = Column(String, primary_key=True, default=gerar_id)

    insumo_id = Column(String, ForeignKey("insumos.id", ondelete="CASCADE"), nullable=False)

    destinatario_email = Column(String, nullable=False)
    coluna_anterior = Column(String, nullable=True)
    coluna_nova = Column(String, nullable=False)

    assunto = Column(String, nullable=False)
    corpo = Column(Text, nullable=False)

    enviado_com_sucesso = Column(Boolean, nullable=False, default=False)
    erro = Column(Text, nullable=True)  # detalhe do erro, se enviado_com_sucesso=False
    modo_simulado = Column(Boolean, nullable=False, default=True)  # True enquanto MOCK_MODE

    criado_em = Column(DateTime(timezone=True), server_default=func.now())
