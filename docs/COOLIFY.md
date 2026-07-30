# Deploy no Coolify

Guia rápido para publicar o **shopee-offers** no [Coolify](https://coolify.io/docs).

Há **duas formas**. A recomendada para começar é a **Opção A**.

---

## Opção A — Dockerfile + PostgreSQL separado (recomendada)

### 1. Criar o PostgreSQL

1. No Coolify: **+ New** → **Database** → **PostgreSQL**
2. Defina usuário, senha e database (ex.: `shopee` / `shopee_offers`)
3. Deploy e aguarde ficar **Running**
4. Copie a **Internal Connection URL** (algo como):

```text
postgresql://shopee:SENHA@xxxxxxxx:5432/shopee_offers
```

> Use a URL **interna** (hostname do container), não a pública.

### 2. Criar a aplicação

1. **+ New** → **Application** → **Public Repository**
2. URL: `https://github.com/thallyson03/Shoppe.git`
3. Branch: `main`
4. Build Pack: **Dockerfile** ([docs](https://coolify.io/docs/applications/build-packs/dockerfile))
5. Base Directory: `/` (raiz)
6. Port: **3000**
7. (Opcional) Domain: ex. `shopee-offers.seudominio.com`

### 3. Environment Variables

Em **Environment Variables**, marque como **Runtime** e cole:

| Key | Valor |
|-----|--------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `LOG_LEVEL` | `info` |
| `DATABASE_URL` | *(Internal URL do Postgres do passo 1)* `?schema=public` |
| `SHOPEE_APP_ID` | seu App ID |
| `SHOPEE_SECRET` | seu Secret |
| `SHOPEE_GRAPHQL_URL` | `https://open-api.affiliate.shopee.com.br/graphql` |
| `SHOPEE_KEYWORD` | *(opcional)* |
| `SHOPEE_LIST_TYPE` | `0` |
| `SHOPEE_SORT_TYPE` | `2` |
| `SHOPEE_PAGE_LIMIT` | `20` |
| `FILTER_MIN_COMMISSION_RATE` | `0.03` |
| `FILTER_MIN_DISCOUNT_RATE` | `10` |
| `FILTER_MIN_RATING` | `4.0` |
| `FILTER_MIN_SALES` | `50` |
| `FILTER_MAX_OFFERS_PER_RUN` | `1` |
| `FILTER_MAX_SAVE_PER_RUN` | `10` |
| `PUBLISH_MAX_PER_DAY` | `50` |
| `PUBLISH_MIN_INTERVAL_MS` | `60000` |
| `PUBLISH_TIMEZONE` | `America/Sao_Paulo` |
| `EVOLUTION_API_URL` | `https://evo-....qzz.io` |
| `EVOLUTION_API_KEY` | sua API key |
| `EVOLUTION_INSTANCE` | `evo-53v20` |
| `EVOLUTION_GROUP_JID` | `120363408915188924@g.us` |
| `EVOLUTION_SEND_DELAY_MS` | `2000` |
| `CRON_SCHEDULE` | `*/5 * * * *` |
| `CRON_RUN_ON_START` | `true` |

> **Importante:** `DATABASE_URL` deve terminar com `?schema=public` se ainda não tiver.

### 4. Deploy

1. Clique em **Deploy**
2. No log, confirme:
   - build Node 22 OK
   - `Aplicando migrations Prisma...`
   - `HTTP listening on :3000`
3. Teste: `GET https://seu-dominio/health`

Health esperado:

```json
{ "status": "ok", "database": "up", "evolution": "open" }
```

### 5. Auto-deploy (opcional)

Em **Webhooks / Git**, ative deploy automático no push para `main`.

---

## Opção B — Docker Compose (app + Postgres juntos)

1. **+ New** → **Docker Compose**
2. Repo: `https://github.com/thallyson03/Shoppe.git`
3. Compose file: `docker-compose.coolify.yml`
4. Defina no painel pelo menos:
   - `POSTGRES_PASSWORD` (forte)
   - `SHOPEE_APP_ID`, `SHOPEE_SECRET`
   - `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`, `EVOLUTION_GROUP_JID`
5. Deploy

> O compose usa a network externa `coolify`. Se o Coolify da sua versão não criar automaticamente, remova o bloco `networks:` do YAML ou ajuste conforme a doc da sua instalação.

---

## Checklist se der erro

| Problema | Solução |
|----------|---------|
| Build falha no `npm ci` | Já tratado no Dockerfile (`npm install` sem lock) |
| `prisma: not found` | `prisma` está em `dependencies` — faça pull da branch atualizada |
| DB connection refused | Use hostname **interno** do Postgres Coolify, não `localhost` |
| Evolution unreachable | URL pública HTTPS da Evolution; firewall liberado |
| `Invalid Signature` Shopee | Conferir App ID/Secret |
| App reinicia em loop | Ver logs: variável obrigatória faltando (Zod fail-fast) |

---

## Pós-deploy

```bash
# Status
curl https://seu-dominio/status

# Rodar um ciclo na mão
curl -X POST https://seu-dominio/offers/run
```

O cron interno (`*/5 * * * *`) continua rodando dentro do container — não precisa de cron externo no Coolify.

---

## Dashboard Web (Next.js) — segundo app no Coolify

1. **+ New** → **Application** → mesmo repo `https://github.com/thallyson03/Shoppe.git`
2. Branch: `main`
3. Build Pack: **Dockerfile**
4. **Base Directory / Dockerfile location:** `web`
5. Port: **3001**
6. Domain: ex. `dashboard.seudominio.com`

### Environment Variables (web)

| Key | Build | Runtime | Valor |
|-----|-------|---------|--------|
| `NEXT_PUBLIC_API_URL` | ✅ | ✅ | URL **pública** da API (ex. `https://api.seudominio.com`) |
| `PORT` | | ✅ | `3001` |
| `NODE_ENV` | | ✅ | `production` |

> `NEXT_PUBLIC_API_URL` precisa estar disponível no **build** (Coolify marca Build Variable).

### Checklist implantação Fase 1

1. Redeploy da **API** (migration `phase1_platform` + multi-grupo)
2. Deploy do **web**
3. Abrir dashboard → WhatsApp → cadastrar grupos
4. `POST /offers/run` ou aguardar cron
5. Confirmar envios em todos os grupos ativos
