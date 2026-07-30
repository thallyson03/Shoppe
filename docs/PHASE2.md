# Fase 2 — Automações, calendário, auth e templates

## Entregue

### Automações e agenda
- **Automações** SE/ENTÃO (desconto, rating, comissão, vendas, preço)
- Ações: `send_whatsapp`, `boost`, `skip`
- **Calendário** de posts agendados (processados no cron)
- **Histórico de preços** com gráfico por produto
- Formulário de campanhas + toggle de grupos

### Multiusuário + templates
- Com `AUTH_ENABLED=true` (padrão), **todas** as rotas `/api/*` e `POST /offers/run` exigem Bearer JWT (`requireAuth` + papéis em escrita)
- Web: middleware redireciona para `/login` sem cookie; menu só aparece após login
- Login JWT (`POST /api/auth/login`) — scrypt + HMAC, sem deps extras
- Papéis: `admin`, `manager`, `operator`, `influencer`
- Biblioteca de templates com placeholders: `{{name}}` `{{price}}` `{{discount}}` `{{rating}}` `{{sales}}` `{{shop}}` `{{link}}`
- Envio WhatsApp usa o template **default** do canal
- Seed: admin + templates WhatsApp / Instagram / Telegram

## Migrations

```bash
npx prisma migrate deploy
```

- `prisma/migrations/20260730150000_phase2_automations`
- `prisma/migrations/20260730160000_phase2_users_templates`

## Telas

| Rota | Função |
|------|--------|
| `/automations` | Criar/ativar regras |
| `/calendar` | Agendar posts |
| `/products/[id]` | Histórico de preços |
| `/campaigns` | Cadastro de campanhas |
| `/groups` | Toggle ativo/inativo |
| `/templates` | Biblioteca de posts |
| `/login` | Login (quando auth ligada) |

## Env (Coolify)

```
AUTH_ENABLED=true              # padrão: exige login
JWT_SECRET=<segredo-longo>
SEED_ADMIN_EMAIL=admin@shoppe.local
SEED_ADMIN_PASSWORD=<trocar>
SEED_ADMIN_NAME=Administrador
```

Login padrão do seed: `admin@shoppe.local` / `admin123` (troque em produção).

## Exemplo de regra

SE `discount > 50` E `rating > 4.8`  
ENTÃO `send_whatsapp`  
→ produto entra na fila mesmo que o filtro padrão seja mais rígido.

## Ainda na Fase 2 (opcional)

- Telegram / Instagram com envio real (hoje: templates + canal no schema)
- UI de gestão de usuários (API já existe: `GET/POST /api/users`)

## Fase 3 (depois)

- IA (OpenRouter)
- conversionReport (comissões reais)
- Analytics avançado
