"""
Serviço de envio de email.

Assim como a sincronização SharePoint (sharepoint_sync.py), o envio de
email usa o Microsoft Graph (Mail.Send, app-only) com o mesmo App
Registration do Azure AD — não depende do login de usuário (MOCK_MODE) nem
de nenhum provedor externo de email. Quem decide entre simular ou enviar de
verdade é a presença das credenciais Azure + EMAIL_REMETENTE:

- Credenciais ausentes (padrão): monta o conteúdo, imprime no console (pra
  você ver o que seria enviado) e grava um registro em EventoEmail com
  modo_simulado=True.
- Credenciais presentes: envia de verdade via `_enviar_via_graph_mail`,
  usando EMAIL_REMETENTE como caixa remetente (precisa ser uma caixa real
  do Microsoft 365 — o Mail.Send de aplicação manda "como" esse usuário).
"""

import logging

import requests
from sqlalchemy.orm import Session

from app.core.config import AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, EMAIL_REMETENTE
from app.models.insumo import Insumo, ColunaKanban
from app.models.evento_email import EventoEmail
from app.services.graph_client import GRAPH_BASE, obter_token_graph

logger = logging.getLogger("cadastro_insumos.email")
logging.basicConfig(level=logging.INFO)

CREDENCIAIS_CONFIGURADAS = bool(AZURE_TENANT_ID and AZURE_CLIENT_ID and AZURE_CLIENT_SECRET and EMAIL_REMETENTE)


TITULOS_COLUNA = {
    ColunaKanban.A_FAZER: "A Fazer",
    ColunaKanban.EM_ANDAMENTO: "Em Andamento",
    ColunaKanban.CONCLUIDO: "Concluído",
    ColunaKanban.CANCELADO: "Cancelado",
}

MENSAGENS_POR_COLUNA = {
    ColunaKanban.A_FAZER: (
        "Sua solicitação foi registrada e está na fila de atendimento."
    ),
    ColunaKanban.EM_ANDAMENTO: (
        "Sua solicitação está sendo atendida no momento."
    ),
    ColunaKanban.CONCLUIDO: (
        "Sua solicitação foi concluída."
    ),
    ColunaKanban.CANCELADO: (
        "Sua solicitação foi cancelada."
    ),
}


def _montar_conteudo(insumo: Insumo, coluna_nova: ColunaKanban) -> tuple[str, str]:
    titulo_coluna = TITULOS_COLUNA[coluna_nova]
    mensagem = MENSAGENS_POR_COLUNA[coluna_nova]

    assunto = f"[Cadastro de Insumos] {insumo.nome_insumo} — {titulo_coluna}"

    motivo_linha = ""
    if coluna_nova == ColunaKanban.CANCELADO and insumo.motivo_cancelamento:
        motivo_linha = f"Motivo do cancelamento: {insumo.motivo_cancelamento}\n"

    insumo_atendente_linha = ""
    if insumo.insumo_atendente:
        insumo_atendente_linha = f"Insumo (preenchido pelo atendimento): {insumo.insumo_atendente}\n"

    corpo = (
        f"Olá, {insumo.solicitante_nome}!\n\n"
        f"{mensagem}\n\n"
        f"Insumo: {insumo.nome_insumo}\n"
        f"ID: {insumo.id}\n"
        f"Local: {insumo.local_exibicao}\n"
        f"Status atual: {titulo_coluna}\n"
        f"{motivo_linha}"
        f"{insumo_atendente_linha}\n"
        f"Este é um email automático do sistema Cadastro de Insumos."
    )

    return assunto, corpo


def _enviar_via_graph_mail(destinatario: str, assunto: str, corpo: str) -> None:
    """
    Envio real via Microsoft Graph (POST /users/{remetente}/sendMail),
    autenticado com o token de aplicação (client credentials). Requer a
    permissão Mail.Send (Application) concedida no App Registration.
    """
    token = obter_token_graph()
    resp = requests.post(
        f"{GRAPH_BASE}/users/{EMAIL_REMETENTE}/sendMail",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={
            "message": {
                "subject": assunto,
                "body": {"contentType": "Text", "content": corpo},
                "toRecipients": [{"emailAddress": {"address": destinatario}}],
            },
            "saveToSentItems": True,
        },
        timeout=15,
    )
    resp.raise_for_status()


def notificar_mudanca_coluna(
    db: Session,
    insumo: Insumo,
    coluna_anterior: ColunaKanban,
    coluna_nova: ColunaKanban,
) -> EventoEmail:
    """
    Ponto de entrada principal: chamado sempre que um card muda de coluna.
    Monta o conteúdo, tenta enviar (ou simula), e registra o evento no banco
    independentemente do resultado — sucesso ou falha ficam auditáveis.
    """
    assunto, corpo = _montar_conteudo(insumo, coluna_nova)
    modo_simulado = not CREDENCIAIS_CONFIGURADAS

    evento = EventoEmail(
        insumo_id=insumo.id,
        destinatario_email=insumo.solicitante_email,
        coluna_anterior=coluna_anterior.value if coluna_anterior else None,
        coluna_nova=coluna_nova.value,
        assunto=assunto,
        corpo=corpo,
        modo_simulado=modo_simulado,
    )

    if modo_simulado:
        logger.info(
            "📧 [SIMULADO] Email para %s\nAssunto: %s\n%s\n%s",
            insumo.solicitante_email,
            assunto,
            "-" * 40,
            corpo,
        )
        evento.enviado_com_sucesso = True
    else:
        try:
            _enviar_via_graph_mail(insumo.solicitante_email, assunto, corpo)
            evento.enviado_com_sucesso = True
        except Exception as exc:  # noqa: BLE001 — queremos capturar qualquer falha de envio
            logger.exception("Falha ao enviar email para %s", insumo.solicitante_email)
            evento.enviado_com_sucesso = False
            evento.erro = str(exc)

    db.add(evento)
    db.commit()
    db.refresh(evento)
    return evento
