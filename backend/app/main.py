"""
Entrypoint do backend Cadastro de Insumos.

Rodar localmente:
    cd backend
    pip install -r requirements.txt
    uvicorn app.main:app --reload --port 8000

Docs interativas (Swagger): http://localhost:8000/docs
"""

import asyncio
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import CORS_ORIGINS, MOCK_MODE, POLLING_INTERVAL_SECONDS
from app.core.database import Base, SessionLocal, engine
from app.routers import insumos, eventos_email, sincronizacao
from app.services.email_service import CREDENCIAIS_CONFIGURADAS as EMAIL_CREDENCIAIS_OK
from app.services.sharepoint_sync import sincronizar, CREDENCIAIS_CONFIGURADAS as SHAREPOINT_CREDENCIAIS_OK

# Importa os modelos pra garantir que fiquem registrados no Base.metadata
# antes do create_all rodar (senão as tabelas não são criadas).
from app import models  # noqa: F401

logger = logging.getLogger("cadastro_insumos.polling")

_tarefa_polling: asyncio.Task | None = None


async def _loop_polling_sharepoint():
    """
    Roda em background enquanto o processo do backend estiver de pé,
    chamando `sincronizar()` a cada POLLING_INTERVAL_SECONDS. Serve pra
    hospedagem em servidor sempre ligado (VM, Railway, Render, App Service).

    Se o backend for hospedado em serverless (ex.: Vercel Functions), esse
    loop não sobrevive entre invocações — nesse caso, trocar por um
    gatilho externo (Vercel Cron / GitHub Actions) chamando
    POST /api/sincronizacao/sharepoint.
    """
    while True:
        db = SessionLocal()
        try:
            resultado = sincronizar(db)
            logger.info("Polling SharePoint: %s", resultado)
        except Exception:
            logger.exception("Falha ao rodar o polling da SharePoint List")
        finally:
            db.close()

        await asyncio.sleep(POLLING_INTERVAL_SECONDS)


app = FastAPI(
    title="Cadastro de Insumos API",
    description="Backend do sistema de cadastro de insumos da DOMMA — "
    "Kanban com sincronização da SharePoint List e notificações automáticas por email.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(insumos.router)
app.include_router(eventos_email.router)
app.include_router(sincronizacao.router)


@app.on_event("startup")
def criar_tabelas():
    Base.metadata.create_all(bind=engine)
    if MOCK_MODE:
        print("\n⚠️  MOCK_MODE ativo: login está simulado, sem chamar Azure AD de verdade.\n")
    print(
        "📧 Email via Microsoft Graph: "
        + ("ENVIO REAL (credenciais Azure/EMAIL_REMETENTE configurados)\n" if EMAIL_CREDENCIAIS_OK else "SIMULADO (defina AZURE_*/EMAIL_REMETENTE no .env para enviar de verdade)\n")
    )
    print(
        "🔄 Sincronização SharePoint: "
        + ("REAL (credenciais Azure/SharePoint configuradas)\n" if SHAREPOINT_CREDENCIAIS_OK else "SIMULADA (defina AZURE_*/SHAREPOINT_* no .env para sincronizar de verdade)\n")
    )


@app.on_event("startup")
async def iniciar_polling_sharepoint():
    if os.getenv("VERCEL"):
        # Serverless: o processo não fica de pé entre requisições, então um
        # loop em background não sobrevive. Usar Vercel Cron Jobs chamando
        # POST /api/sincronizacao/sharepoint em vez disso.
        logger.info(
            "Rodando na Vercel: loop de polling em processo desativado. "
            "Configure um Cron Job chamando POST /api/sincronizacao/sharepoint."
        )
        return

    global _tarefa_polling
    _tarefa_polling = asyncio.create_task(_loop_polling_sharepoint())
    logger.info(
        "Polling automático da SharePoint List ativado (a cada %ss).",
        POLLING_INTERVAL_SECONDS,
    )


@app.on_event("shutdown")
async def parar_polling_sharepoint():
    if _tarefa_polling:
        _tarefa_polling.cancel()


@app.get("/api/saude")
def verificar_saude():
    return {"status": "ok", "mock_mode": MOCK_MODE}
