# Fase 1 — Plataforma de afiliados

## Entregue nesta fase

- Integração Shopee Open API (já existente)
- Sync de **produtos / lojas / histórico de preço**
- Evolution API + envio WhatsApp com cota anti-spam
- Schema ampliado: `products`, `shops`, `channels`, `whatsapp_groups`, `campaigns`, `price_history`
- **Dashboard web** (Next.js) com KPIs de envios, catálogo, grupos e campanhas
- APIs REST do dashboard

## Rodar local

### API / worker

```bash
cd shopee-offers
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

API: `http://localhost:3000`

### Web (dashboard)

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

Dashboard: `http://localhost:3001`

## Endpoints novos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/dashboard` | KPIs + envios + top produtos + jobs |
| GET | `/api/products` | Catálogo com filtros |
| GET/POST | `/api/groups` | Grupos WhatsApp |
| GET/POST | `/api/campaigns` | Campanhas |

## Deploy Coolify (web)

1. App separado, Base Directory = `web`, porta `3001`
2. `NEXT_PUBLIC_API_URL` = URL pública da API (build + runtime)

Guia completo: [`COOLIFY.md`](./COOLIFY.md)

## Placeholders (Fase 3)

Comissão hoje/mês, cliques e conversões aparecem como `—` até integrar `conversionReport` da Shopee.

## Próximo (Fase 2)

- Automações visuais
- Agendamento (calendário)
- Multiusuário
- Histórico de preços no gráfico do dashboard
