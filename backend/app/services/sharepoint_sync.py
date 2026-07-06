"""
Sincronização com a SharePoint List "Cadastro de Insumos".

O Microsoft Forms continua sendo o ponto de entrada para os solicitantes —
não estamos substituindo ele. Este serviço verifica a lista do SharePoint
por itens novos (que o Forms cria automaticamente a cada resposta) e os
importa para o nosso banco, aparecendo no Kanban.

Assim como o Resend (email_service.py), essa integração NÃO depende do
MOCK_MODE geral — ela usa suas próprias credenciais de aplicação (Azure AD
via client credentials), independentes do login de usuário (MSAL). Quem
decide entre simular ou buscar de verdade é a presença de AZURE_TENANT_ID/
AZURE_CLIENT_ID/AZURE_CLIENT_SECRET/SHAREPOINT_SITE_ID/SHAREPOINT_LIST_ID.

MAPEAMENTO DE CAMPOS (descoberto inspecionando a lista real em 2026-07-06):
  Situação (Pendente/Em Aberto/Concluído/Cancelado) -> coluna do Kanban
  Obra(s) (choice, valores "Domma*"/"Stand de Vendas*" = escritório/stand,
           os demais = nome da obra)
  LinkTitle, UnidadedeMedida, Detalhes, Marca, Aplicação -> campos diretos
  Solicitante (Person) -> não resolvido via lookup; usamos createdBy do
           próprio item, que na prática é sempre a mesma pessoa (quem
           preenche o Forms é quem aparece como autor do item)
  Data -> data_solicitacao (só a parte da data, o campo é datetime)

Limitação atual: só importa itens novos (não atualiza coluna/status de um
item já importado se ele mudar de novo na lista do SharePoint depois).
"""

import logging
from datetime import date, datetime, timedelta

import requests
from sqlalchemy.orm import Session

from app.core.config import (
    AZURE_TENANT_ID,
    AZURE_CLIENT_ID,
    AZURE_CLIENT_SECRET,
    SHAREPOINT_SITE_ID,
    SHAREPOINT_LIST_ID,
    SHAREPOINT_SYNC_DESDE,
)
from app.models.insumo import Insumo, TipoLocal, ColunaKanban, OrigemInsumo
from app.services.graph_client import GRAPH_BASE, obter_token_graph

logger = logging.getLogger("cadastro_insumos.sharepoint_sync")

CREDENCIAIS_CONFIGURADAS = bool(
    AZURE_TENANT_ID and AZURE_CLIENT_ID and AZURE_CLIENT_SECRET and SHAREPOINT_SITE_ID and SHAREPOINT_LIST_ID
)

SITUACAO_PARA_COLUNA = {
    "Pendente": ColunaKanban.A_FAZER,
    "Em Aberto": ColunaKanban.EM_ANDAMENTO,
    "Concluído": ColunaKanban.CONCLUIDO,
    "Cancelado": ColunaKanban.CANCELADO,
}

# Valores da coluna "Obra(s)" que na verdade representam escritório/stand,
# não uma obra de verdade.
PREFIXOS_ESCRITORIO = ("Domma", "Stand de Vendas")


def _itens_simulados_sharepoint() -> list[dict]:
    """
    Dados de exemplo simulando o que o Graph API retornaria da lista.
    Usado só quando as credenciais Azure/SharePoint não estão configuradas,
    pra exercitar o fluxo de importação e dedupe sem depender delas.
    """
    ontem = (date.today() - timedelta(days=1)).isoformat()
    return [
        {
            "sharepoint_item_id": "SP-DEMO-001",
            "nome_insumo": "Cimento CP-II 50kg",
            "unidade_medida": "Sc.",
            "tipo_local": TipoLocal.OBRA,
            "obra": "Unic São Gonçalo",
            "detalhes": "Reposição de estoque para fundação do bloco B.",
            "marca": "Votorantim",
            "aplicacao": "Obra",
            "solicitante_nome": "Wagner Guilherme Valentim",
            "solicitante_email": "wagner.valentim@dommainc.com.br",
            "data_solicitacao": ontem,
            "coluna": ColunaKanban.A_FAZER,
        },
    ]


def _mapear_item(item: dict) -> dict | None:
    """Converte um item bruto do Graph API pro formato usado por `sincronizar`."""
    fields = item.get("fields", {})

    situacao = fields.get("Situa_x00e7__x00e3_o")
    coluna = SITUACAO_PARA_COLUNA.get(situacao)
    if coluna is None:
        logger.warning("Item %s com Situação desconhecida (%r) — ignorado.", item.get("id"), situacao)
        return None

    obras = fields.get("Obra_x0028_s_x0029_") or []
    obra_bruta = obras[0] if obras else None
    eh_escritorio = obra_bruta is None or obra_bruta.startswith(PREFIXOS_ESCRITORIO)

    criado_por = item.get("createdBy", {}).get("user", {})

    data_bruta = fields.get("Data")
    data_solicitacao = data_bruta[:10] if data_bruta else datetime.utcnow().date().isoformat()

    return {
        "sharepoint_item_id": str(item["id"]),
        "nome_insumo": fields.get("LinkTitle") or fields.get("Title") or "(sem nome)",
        "unidade_medida": (fields.get("UnidadedeMedida") or "").strip() or "Un.",
        "tipo_local": TipoLocal.ESCRITORIO if eh_escritorio else TipoLocal.OBRA,
        "obra": None if eh_escritorio else obra_bruta,
        "detalhes": fields.get("Detalhes") or "",
        "marca": fields.get("Marca"),
        "aplicacao": fields.get("Aplica_x00e7__x00e3_o") or "",
        "solicitante_nome": criado_por.get("displayName") or "Solicitante SharePoint",
        "solicitante_email": criado_por.get("email") or "",
        "data_solicitacao": data_solicitacao,
        "coluna": coluna,
    }


def _buscar_itens_via_graph_api() -> list[dict]:
    """
    Busca real dos itens da SharePoint List via Microsoft Graph, paginando
    todos os resultados. Filtra por data de criação (SHAREPOINT_SYNC_DESDE)
    quando configurado, pra não trazer o histórico inteiro da lista.
    """
    token = obter_token_graph()
    headers = {
        "Authorization": f"Bearer {token}",
        # Necessário pro Graph aceitar $filter em campos não indexados (Created).
        "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly",
    }

    url = f"{GRAPH_BASE}/sites/{SHAREPOINT_SITE_ID}/lists/{SHAREPOINT_LIST_ID}/items"
    params = {"$expand": "fields"}
    if SHAREPOINT_SYNC_DESDE:
        params["$filter"] = f"fields/Created gt '{SHAREPOINT_SYNC_DESDE}'"

    itens_brutos = []
    proxima_url = url
    proximos_params = params
    while proxima_url:
        resp = requests.get(proxima_url, headers=headers, params=proximos_params, timeout=30)
        resp.raise_for_status()
        # O Graph API responde UTF-8, mas o requests às vezes adivinha a
        # codificação errado (deixando acentos corrompidos) — força aqui.
        resp.encoding = "utf-8"
        corpo = resp.json()
        itens_brutos.extend(corpo.get("value", []))
        proxima_url = corpo.get("@odata.nextLink")
        proximos_params = None  # a nextLink já vem com os query params embutidos

    itens_mapeados = []
    for item in itens_brutos:
        mapeado = _mapear_item(item)
        if mapeado is not None:
            itens_mapeados.append(mapeado)
    return itens_mapeados


def sincronizar(db: Session) -> dict:
    """
    Busca itens da SharePoint List (real ou simulada) e importa os que
    ainda não existem no nosso banco, usando sharepoint_item_id como chave
    de deduplicação — assim rodar o polling várias vezes não duplica cards.
    """
    if not CREDENCIAIS_CONFIGURADAS:
        itens_remotos = _itens_simulados_sharepoint()
    else:
        try:
            itens_remotos = _buscar_itens_via_graph_api()
        except Exception as exc:  # noqa: BLE001 — qualquer falha de rede/auth vira erro reportado, não crash
            logger.exception("Falha ao buscar itens da SharePoint List")
            return {"importados": 0, "ignorados": 0, "erro": str(exc)}

    importados = 0
    ignorados = 0

    for item in itens_remotos:
        if not item.get("solicitante_email"):
            logger.warning("Item %s sem email de solicitante — ignorado.", item.get("sharepoint_item_id"))
            ignorados += 1
            continue

        ja_existe = (
            db.query(Insumo)
            .filter(Insumo.sharepoint_item_id == item["sharepoint_item_id"])
            .first()
        )
        if ja_existe:
            ignorados += 1
            continue

        novo = Insumo(
            nome_insumo=item["nome_insumo"],
            unidade_medida=item["unidade_medida"],
            tipo_local=item["tipo_local"],
            obra=item.get("obra"),
            detalhes=item["detalhes"],
            marca=item.get("marca"),
            aplicacao=item["aplicacao"],
            solicitante_nome=item["solicitante_nome"],
            solicitante_email=item["solicitante_email"],
            data_solicitacao=item["data_solicitacao"],
            coluna=item["coluna"],
            origem=OrigemInsumo.SHAREPOINT,
            sharepoint_item_id=item["sharepoint_item_id"],
        )
        db.add(novo)
        importados += 1
        logger.info("Importado da SharePoint List: %s (%s)", novo.nome_insumo, novo.id)

    db.commit()

    return {"importados": importados, "ignorados": ignorados, "erro": None}
