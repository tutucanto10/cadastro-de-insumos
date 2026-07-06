"""
Serviço de envio de email.

Diferente de login (auth.py) e sincronização SharePoint (sharepoint_sync.py),
o envio de email NÃO depende do MOCK_MODE geral — o Resend não tem nenhuma
relação com Azure AD. Aqui quem decide entre simular ou enviar de verdade é
só a presença de RESEND_API_KEY no .env:

- RESEND_API_KEY vazio (padrão): monta o conteúdo, imprime no console (pra
  você ver o que seria enviado) e grava um registro em EventoEmail com
  modo_simulado=True.
- RESEND_API_KEY preenchido: envia de verdade via `_enviar_via_resend`.

Isso permite ligar o Resend de verdade mantendo login e SharePoint mockados
até a integração com Azure AD acontecer.
"""

import logging

import resend
from sqlalchemy.orm import Session

from app.core.config import RESEND_API_KEY, RESEND_FROM_EMAIL
from app.models.insumo import Insumo, ColunaKanban
from app.models.evento_email import EventoEmail

logger = logging.getLogger("cadastro_insumos.email")
logging.basicConfig(level=logging.INFO)


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

    corpo = (
        f"Olá, {insumo.solicitante_nome}!\n\n"
        f"{mensagem}\n\n"
        f"Insumo: {insumo.nome_insumo}\n"
        f"ID: {insumo.id}\n"
        f"Local: {insumo.local_exibicao}\n"
        f"Status atual: {titulo_coluna}\n\n"
        f"Este é um email automático do sistema Cadastro de Insumos."
    )

    return assunto, corpo


def _enviar_via_resend(destinatario: str, assunto: str, corpo: str) -> None:
    """
    Envio real via Resend (https://resend.com/docs/api-reference/emails/send-email).

    Requer RESEND_API_KEY configurado no .env e um remetente (RESEND_FROM_EMAIL)
    de um domínio verificado na conta Resend — o domínio sandbox
    `onboarding@resend.dev` só entrega para o email dono da conta.
    """
    resend.api_key = RESEND_API_KEY
    resend.Emails.send(
        {
            "from": RESEND_FROM_EMAIL,
            "to": [destinatario],
            "subject": assunto,
            "text": corpo,
        }
    )


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
    modo_simulado = not bool(RESEND_API_KEY)

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
            _enviar_via_resend(insumo.solicitante_email, assunto, corpo)
            evento.enviado_com_sucesso = True
        except Exception as exc:  # noqa: BLE001 — queremos capturar qualquer falha de envio
            logger.exception("Falha ao enviar email para %s", insumo.solicitante_email)
            evento.enviado_com_sucesso = False
            evento.erro = str(exc)

    db.add(evento)
    db.commit()
    db.refresh(evento)
    return evento
