# Cadastro de Insumos

Sistema Kanban interno da DOMMA para acompanhamento de solicitações de insumos.
Recebe itens tanto do próprio formulário (com login Microsoft) quanto da SharePoint
List existente ("Cadastro de Insumos" no site Engenharia-PlanejamentoeControle),
via polling da Microsoft Graph API.

---

## Stack

| Parte | Tecnologia |
|---|---|
| Backend | FastAPI + SQLAlchemy |
| Banco (dev) | SQLite |
| Banco (prod) | PostgreSQL |
| Frontend | React + Vite |
| Auth | Azure AD / MSAL (mockado — login de usuário ainda não implementado) |
| Email | Resend (real se `RESEND_API_KEY` estiver preenchido, senão simulado) |
| SharePoint sync | Microsoft Graph API real (client credentials, independente do login) |

---

## Pré-requisitos

- Python 3.11+
- Node.js 18+

---

## Rodando localmente

### 1. Backend

```bash
cd backend

# Instalar dependências
pip install -r requirements.txt

# Copiar e revisar variáveis de ambiente
cp .env.example .env

# Subir o servidor (SQLite criado automaticamente na primeira execução)
uvicorn app.main:app --reload --port 8000
```

Docs interativas (Swagger): http://localhost:8000/docs

> **MOCK_MODE=true** (padrão): login e email são simulados.
> Nenhuma credencial Azure é necessária para desenvolver.

---

### 2. Frontend

```bash
cd frontend

npm install
npm run dev
```

Abre em: http://localhost:5173

Na tela de login simulado, entre com qualquer nome e email `@dommainc.com.br`.

---

## Estrutura de pastas

```
cadastro-insumos/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py       # Variáveis de ambiente e settings
│   │   │   ├── database.py     # Engine SQLAlchemy + sessão
│   │   │   └── auth.py         # Auth mockada (placeholder pro MSAL)
│   │   ├── models/
│   │   │   ├── insumo.py       # Modelo SQLAlchemy: card do Kanban
│   │   │   ├── evento_email.py # Modelo: histórico de emails disparados
│   │   │   ├── schemas.py      # Schemas Pydantic (entrada/saída da API)
│   │   │   └── __init__.py
│   │   ├── routers/
│   │   │   ├── insumos.py      # CRUD + mudança de coluna
│   │   │   ├── eventos_email.py# Consulta ao histórico de emails
│   │   │   └── sincronizacao.py# Disparo manual do polling SharePoint
│   │   ├── services/
│   │   │   ├── email_service.py        # Envio via Resend (ou mock)
│   │   │   └── sharepoint_sync.py      # Polling da SharePoint List
│   │   └── main.py             # Entrypoint FastAPI
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── TelaLogin.jsx       # Login simulado (placeholder MSAL)
    │   │   ├── FormularioInsumo.jsx# Form 3-etapas com email pré-preenchido
    │   │   ├── CardInsumo.jsx      # Card do Kanban
    │   │   ├── DetalheCard.jsx     # Painel lateral com histórico de emails
    │   │   ├── FiltroLocal.jsx     # Dropdown Todos/Escritório/Obra
    │   │   └── Icon.jsx            # Ícones SVG inline
    │   ├── services/
    │   │   ├── api.js              # Cliente REST do backend
    │   │   └── auth.js             # Sessão mockada (placeholder MSAL)
    │   ├── constants.js            # OBRAS, COLUNAS, FILTROS_LOCAL
    │   ├── estilos.css
    │   ├── App.jsx
    │   └── main.jsx
    ├── package.json
    └── vite.config.js
```

---

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/saude` | Health check |
| GET | `/api/insumos` | Lista cards (aceita `?tipo_local=escritorio\|obra` e `?busca=`) |
| POST | `/api/insumos` | Cria novo card |
| PATCH | `/api/insumos/{id}/coluna` | Move card entre colunas (dispara email) |
| DELETE | `/api/insumos/{id}` | Remove card |
| GET | `/api/eventos-email` | Histórico de emails (aceita `?insumo_id=`) |
| POST | `/api/sincronizacao/sharepoint` | Dispara polling da SharePoint List |

---

## Próximos passos (integração Azure AD)

### 1. App Registration no Azure AD

1. Acessa portal.azure.com → Microsoft Entra ID → App registrations → New registration
2. Nome: `Cadastro de Insumos`
3. Redirect URI: `http://localhost:5173` (dev) / URL de produção depois
4. Em **API permissions**, adiciona:
   - `Sites.Read.All` (Application) — leitura da SharePoint List
   - `User.Read` (Delegated) — login do usuário
5. Gera um **Client Secret** em Certificates & secrets
6. Copia **Tenant ID**, **Client ID** e o **Client Secret** para o `.env`

### 2. Preencher o `.env` do backend

```env
MOCK_MODE=false
AZURE_TENANT_ID=<seu-tenant-id>
AZURE_CLIENT_ID=<client-id-do-app>
AZURE_CLIENT_SECRET=<client-secret>
```

### 3. Descobrir os IDs do SharePoint

Com as credenciais configuradas, rode no Postman ou curl:

```bash
# Site ID
GET https://graph.microsoft.com/v1.0/sites/dommainc.sharepoint.com:/sites/Engenharia-PlanejamentoeControle

# List ID (pegar o id da lista "Cadastro de Insumos")
GET https://graph.microsoft.com/v1.0/sites/{site-id}/lists
```

Adiciona ao `.env`:

```env
SHAREPOINT_SITE_ID=<site-id>
SHAREPOINT_LIST_ID=<list-id>
```

### 4. Implementar as funções marcadas como `NotImplementedError`

Isso é só sobre o **login de usuário** — a sincronização SharePoint (client
credentials, app-only) já está implementada e funcionando de verdade em
`backend/app/services/sharepoint_sync.py`, independente do login.

- `backend/app/core/auth.py` → validação do token Bearer Azure AD
- `frontend/src/services/auth.js` → trocar o login mock por `@azure/msal-browser`

Cada função tem comentários detalhando exatamente o que implementar e a
referência da documentação Microsoft relevante.

---

## Sincronização automática da SharePoint List

Como o backend roda como função serverless na Vercel, não dá pra manter um
loop rodando sozinho em segundo plano — algo externo precisa chamar
`POST /api/sincronizacao/sharepoint` periodicamente. Isso é feito por um
workflow do GitHub Actions em `.github/workflows/sync-sharepoint.yml`, que
roda a cada ~10 minutos (o GitHub não garante precisão exata do horário).

Variáveis relevantes no `.env`/Vercel:

```env
AZURE_TENANT_ID=...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
SHAREPOINT_SITE_ID=...
SHAREPOINT_LIST_ID=...
SHAREPOINT_SYNC_DESDE=2026-07-06T18:11:43Z
```

`SHAREPOINT_SYNC_DESDE` é o corte: só itens criados na lista **depois**
dessa data são importados. Isso evita trazer o histórico inteiro da lista
na primeira sincronização real — ajuste (ou remova) se quiser mudar esse
comportamento.

---

## Configurar o Resend (envio de email)

O envio de email nas mudanças de coluna usa o [Resend](https://resend.com) e
**não depende do Azure AD nem do `MOCK_MODE`** — dá pra ligar isso de verdade
mesmo com login e SharePoint ainda mockados.

1. Cria uma conta em resend.com e gera uma API key em **API Keys**
2. Pra produção, verifica um domínio próprio em **Domains** (o remetente
   sandbox `onboarding@resend.dev` só entrega para o email dono da conta)
3. Preenche no `.env` do backend:

```env
RESEND_API_KEY=<sua-api-key>
RESEND_FROM_EMAIL=notificacoes@seu-dominio.com.br
```

A função `_enviar_via_resend()` em `backend/app/services/email_service.py`
já está pronta — basta preencher `RESEND_API_KEY` que os emails passam a
sair de verdade. Deixando vazio, continua simulado (só loga no console).

---

## Migrando de SQLite para PostgreSQL

Basta trocar a variável `DATABASE_URL` no `.env`:

```env
DATABASE_URL=postgresql://usuario:senha@host:5432/cadastro_insumos
```

O SQLAlchemy cuida do resto — nenhum código de modelo ou router muda.
Para migrações incrementais (adicionar colunas depois que o sistema já
estiver em produção), o caminho recomendado é Alembic.
