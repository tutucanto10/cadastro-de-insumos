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
| Auth | Azure AD / MSAL (real se `MOCK_MODE=false` + `VITE_AZURE_*`, senão mockado) |
| Email | Microsoft Graph / Outlook (real se `EMAIL_REMETENTE` estiver preenchido, senão simulado) |
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

Login real via Microsoft (MSAL) — precisa das variáveis `VITE_AZURE_*` no
`.env` do frontend (ver seção de integração Azure AD abaixo). Sem elas
configuradas, o botão de login não funciona.

---

## Estrutura de pastas

```
cadastro-insumos/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py       # Variáveis de ambiente e settings
│   │   │   ├── database.py     # Engine SQLAlchemy + sessão
│   │   │   └── auth.py         # Valida token Azure AD (JWT) — ou mock, se MOCK_MODE=true
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
│   │   │   ├── email_service.py        # Envio via Microsoft Graph (ou mock)
│   │   │   └── sharepoint_sync.py      # Polling da SharePoint List
│   │   └── main.py             # Entrypoint FastAPI
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── TelaLogin.jsx       # Botão de login (MSAL)
    │   │   ├── FormularioInsumo.jsx# Form 3-etapas com email pré-preenchido
    │   │   ├── CardInsumo.jsx      # Card do Kanban
    │   │   ├── DetalheCard.jsx     # Painel lateral com histórico de emails
    │   │   ├── FiltroLocal.jsx     # Dropdown Todos/Escritório/Obra
    │   │   └── Icon.jsx            # Ícones SVG inline
    │   ├── services/
    │   │   ├── api.js              # Cliente REST do backend
    │   │   └── auth.js             # Login real via MSAL (redirect)
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

## Integração Azure AD (login, SharePoint e email)

Um único App Registration no Azure AD ("Cadastro de insumos") cobre as três
integrações — cada uma usa uma permissão diferente, mas compartilham
Tenant ID e Client ID:

| Integração | Permissão | Tipo | Depende de login de usuário? |
|---|---|---|---|
| Login (MSAL) | `User.Read` | Delegated | — |
| Sincronização SharePoint | `Sites.Read.All` | Application | Não (client credentials) |
| Email (Outlook) | `Mail.Send` | Application | Não (client credentials) |

### Configurar o App Registration

1. portal.azure.com → Microsoft Entra ID → App registrations → New registration
2. Em **Authentication**, adiciona uma plataforma **"Single-page application"**
   com as Redirect URIs: `http://localhost:5173`, `https://seu-dominio-de-producao`
   e as mesmas duas com `/blank.html` no final (usada pra processar o retorno
   do login sem recarregar o app inteiro)
3. Em **API permissions**, adiciona as três permissões da tabela acima e clica
   em **"Conceder consentimento do administrador"**
4. Gera um **Client Secret** em Certificates & secrets (usado por
   SharePoint/email, não pelo login)

### Preencher o `.env` do backend

```env
MOCK_MODE=false
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
```

`MOCK_MODE=false` ativa a validação real do token Azure AD no login — sem
isso, o backend continua aceitando os headers mock (`X-User-Name`/`X-User-Email`).

### Preencher o `.env` do frontend

```env
VITE_AZURE_CLIENT_ID=<client-id>
VITE_AZURE_TENANT_ID=<tenant-id>
```

Client ID e Tenant ID não são segredo (ficam expostos no bundle do frontend
de qualquer forma) — só o Client Secret fica só no backend.

### Descobrir os IDs do SharePoint (site + list)

```bash
# Site ID
GET https://graph.microsoft.com/v1.0/sites/dommainc.sharepoint.com:/sites/Engenharia-PlanejamentoeControle

# List ID (pegar o id da lista "Cadastro de Insumos")
GET https://graph.microsoft.com/v1.0/sites/{site-id}/lists
```

```env
SHAREPOINT_SITE_ID=<site-id>
SHAREPOINT_LIST_ID=<list-id>
```

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

## Configurar o email (Microsoft Graph / Outlook)

O envio de email nas mudanças de coluna usa o mesmo App Registration do
Azure AD já usado pela sincronização SharePoint (`Mail.Send`, Application),
mandando via uma caixa real do Microsoft 365 — não usa nenhum provedor
externo (evita ter que verificar domínio em serviços tipo Resend/SendGrid).

1. No mesmo App Registration usado pro SharePoint (portal.azure.com →
   Microsoft Entra ID → App registrations → seu app), vai em
   **"Permissões de APIs"** → **"+ Adicionar uma permissão"** → **Microsoft
   Graph** → **Application permissions** → busca `Mail.Send` → adiciona
2. Clica em **"Conceder consentimento do administrador"**
3. Preenche no `.env` do backend a caixa remetente (precisa ser uma caixa
   real do tenant — o Mail.Send de aplicação manda "como" esse usuário):

```env
EMAIL_REMETENTE=planejamento@dommainc.com.br
```

A função `_enviar_via_graph_mail()` em `backend/app/services/email_service.py`
já está pronta — basta ter as credenciais `AZURE_*` (as mesmas do
SharePoint) e `EMAIL_REMETENTE` preenchidas que os emails passam a sair de
verdade. Deixando `EMAIL_REMETENTE` vazio, continua simulado (só loga no
console).

---

## Migrando de SQLite para PostgreSQL

Basta trocar a variável `DATABASE_URL` no `.env`:

```env
DATABASE_URL=postgresql://usuario:senha@host:5432/cadastro_insumos
```

O SQLAlchemy cuida do resto — nenhum código de modelo ou router muda.
Para migrações incrementais (adicionar colunas depois que o sistema já
estiver em produção), o caminho recomendado é Alembic.
