# Shopee Offers

Sistema profissional que monitora ofertas da **Shopee Affiliate Open API (GraphQL)**, filtra por qualidade, evita repetição no PostgreSQL e publica automaticamente no **WhatsApp** via **Evolution API**.

```bash
npm install
cp .env.example .env   # preencha as credenciais
npm run prisma:deploy  # cria as tabelas
npm run dev            # monitora e publica a cada 5 minutos
```

---

## Arquitetura

```
shopee-offers/
├── prisma/                  # Schema + migrations
├── sql/                     # SQL de referência / queries operacionais
├── src/
│   ├── config/              # Validação de .env (Zod)
│   ├── database/            # Prisma client singleton
│   ├── services/
│   │   ├── shopee/          # Auth HMAC-SHA256 + GraphQL productOfferV2
│   │   ├── evolution/       # Envio WhatsApp (sendText / grupo)
│   │   ├── filters/         # Regras de qualidade + message builder
│   │   └── offer-pipeline.service.ts
│   ├── cron/                # node-cron (*/5 * * * *)
│   ├── repositories/        # Repository Pattern
│   ├── models/              # DTOs / contratos de domínio
│   ├── routes/              # Health, status, trigger manual
│   ├── utils/               # Logger, auth, format, errors
│   ├── app.ts
│   └── server.ts
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

### Fluxo (a cada 5 minutos)

1. **Login/Auth** — assina a requisição GraphQL com HMAC-SHA256  
2. **Buscar** — `productOfferV2` na Open API  
3. **Filtrar** — comissão, desconto, rating, vendas  
4. **Deduplicar** — `item_id` único no PostgreSQL  
5. **Salvar** — tabela `offers`  
6. **Montar mensagem** — template WhatsApp formatado  
7. **Enviar** — Evolution API → grupo (`@g.us`)  
8. **Logar** — `publish_logs` + `job_runs`

Padrões: **SOLID**, **Clean Code**, **Repository Pattern**, **Service Layer**, tipagem completa TypeScript.

---

## Pré-requisitos

| Recurso | Detalhe |
|---------|---------|
| Node.js | **22+** |
| PostgreSQL | 14+ (ou via Docker) |
| Shopee Affiliate | App ID + Secret ([solicitar Open API](https://affiliate.shopee.com.br)) |
| Evolution API | Instância conectada + JID do grupo |

---

## Configuração (.env)

```bash
cp .env.example .env
```

Variáveis principais:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string PostgreSQL |
| `SHOPEE_APP_ID` / `SHOPEE_SECRET` | Credenciais Open API |
| `SHOPEE_KEYWORD` | Palavra-chave (opcional) |
| `FILTER_*` | Limiares de qualidade |
| `EVOLUTION_API_URL` | Base URL da Evolution |
| `EVOLUTION_API_KEY` | API Key |
| `EVOLUTION_INSTANCE` | Nome da instância |
| `EVOLUTION_GROUP_JID` | Ex: `1203630xxxxx@g.us` |
| `CRON_SCHEDULE` | Padrão `*/5 * * * *` |

> Como obter o JID do grupo: na Evolution, liste grupos da instância (`GET /group/fetchAllGroups/{instance}`) e copie o `id` que termina em `@g.us`. Habilite interação com grupos nas settings da instância.

---

## Execução local

### 1. Banco de dados

```bash
# Opção A — só o Postgres
docker compose up -d postgres

# Opção B — Postgres + app (produção-like)
docker compose up -d --build
```

### 2. Dependências e schema

```bash
npm install
npx prisma generate
npx prisma migrate deploy
```

### 3. Subir o monitor

```bash
npm run dev
```

Com `CRON_RUN_ON_START=true`, o primeiro ciclo roda na subida.

### Scripts

| Comando | Função |
|---------|--------|
| `npm run dev` | Desenvolvimento com hot reload (`tsx watch`) |
| `npm run build` | Compila para `dist/` |
| `npm start` | Produção (`node dist/server.js`) |
| `npm run prisma:studio` | UI do banco |
| `npm run lint` | Typecheck (`tsc --noEmit`) |

---

## API HTTP

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/` | Metadados do serviço |
| `GET` | `/health` | Saúde (DB + Evolution) |
| `GET` | `/status` | Contadores e últimos jobs |
| `POST` | `/offers/run` | Dispara um ciclo manualmente |

Exemplo:

```bash
curl -X POST http://localhost:3000/offers/run
curl http://localhost:3000/status
```

---

## Docker

```bash
cp .env.example .env
# ajuste DATABASE_URL para o host interno: postgres:5432 (já feito no compose)

docker compose up -d --build
```

A imagem aplica `prisma migrate deploy` antes de iniciar o processo.

---

## Banco de dados (Prisma / SQL)

Tabelas:

- **`offers`** — produtos capturados (`item_id` único → sem repetição)
- **`publish_logs`** — auditoria de envios WhatsApp
- **`job_runs`** — métricas de cada ciclo do cron

SQL de referência e queries úteis: [`sql/init.sql`](./sql/init.sql).

---

## Mensagem enviada (exemplo)

```
🛍️ *OFERTA SHOPEE*

📦 *Fone Bluetooth XYZ Pro*

💰 Preço: *R$ 89,90*
🏷️ Desconto: *45%*
⭐ 4.8
🔥 12.340 vendidos
🏪 Loja Oficial XYZ

🔗 https://s.shopee.com.br/...

_Comissão afiliado: 8.5%_
_Envio automático · Confira no app_
```

---

## Qualidade e produção

- Configuração validada na subida (fail-fast com Zod)
- Logger estruturado (Pino)
- Graceful shutdown (`SIGINT` / `SIGTERM`)
- Deduplicação por `item_id` + `skipDuplicates`
- Lock simples evita overlap de ciclos do cron
- Delay configurável entre envios (anti-flood)
- Helmet + CORS na API
- Dockerfile multi-stage (Node 22 Alpine)

---

## Troubleshooting

| Sintoma | Causa provável |
|---------|----------------|
| `Invalid Signature` (10020) | App ID/Secret errados ou clock do servidor |
| `No API Access` (10035) | Open API ainda não liberada pela Shopee |
| Evolution `SessionError` | Instância desconectada ou grupos desabilitados |
| Nenhuma oferta publicada | Filtros muito rígidos ou todas já no banco |
| Cron não dispara | `CRON_SCHEDULE` inválido |

Ajuste filtros no `.env` se estiver bloqueando demais:

```env
FILTER_MIN_COMMISSION_RATE=0.01
FILTER_MIN_DISCOUNT_RATE=5
FILTER_MIN_RATING=3.5
FILTER_MIN_SALES=10
```

---

## Licença

MIT
