# Fase 3 — Conversões, analytics e IA

## Entregue

### conversionReport (Shopee)
- Query GraphQL `conversionReport` no client
- Tabelas `conversions` + `conversion_items`
- Sync automático a cada N ciclos do cron (padrão: a cada 6 = ~30 min)
- Sync manual: `POST /api/conversions/sync`
- KPIs do dashboard: comissão hoje/mês + conversões

### Analytics
- `GET /api/analytics?from=&to=`
- Tela `/analytics`: série diária, top produtos, status, recentes

### IA (OpenRouter) — opcional
- `AI_MESSAGE_ENABLED=true` + `OPENROUTER_API_KEY`
- Reescreve caption do WhatsApp a partir do template (fallback se falhar)
- Não inventa preço; preserva o link afiliado

## Migration

```bash
npx prisma migrate deploy
```

Arquivo: `prisma/migrations/20260730180000_phase3_conversions`

## Env (Coolify — API)

```
CONVERSION_SYNC_ENABLED=true
CONVERSION_SYNC_DAYS=30
CONVERSION_SYNC_EVERY_N_RUNS=6

AI_MESSAGE_ENABLED=false
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4o-mini
```

## Notas

- **Cliques:** a API afiliado BR não expõe endpoint de cliques → KPI permanece `—`
- Janela máxima tipica do report: ~90 dias
- `orderStatus` GraphQL: `ALL | UNPAID | PENDING | COMPLETED | CANCELLED`

## Deploy

1. Redeploy **API** (migration + sync)
2. Redeploy **web** (KPIs + `/analytics`)
3. No dashboard: Analytics → **Sync Shopee** (ou aguardar o cron)
