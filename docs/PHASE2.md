# Fase 2 — Automações, calendário e histórico de preços

## Entregue

- **Automações** SE/ENTÃO (desconto, rating, comissão, vendas, preço)
- Ações: `send_whatsapp`, `boost`, `skip`
- **Calendário** de posts agendados (processados no cron)
- **Histórico de preços** com gráfico por produto
- Fase 1 fechada: formulário de campanhas + toggle de grupos

## Migration

```bash
npx prisma migrate deploy
```

Arquivo: `prisma/migrations/20260730150000_phase2_automations`

## Telas

| Rota | Função |
|------|--------|
| `/automations` | Criar/ativar regras |
| `/calendar` | Agendar posts |
| `/products/[id]` | Histórico de preços |
| `/campaigns` | Cadastro de campanhas |
| `/groups` | Toggle ativo/inativo |

## Exemplo de regra

SE `discount > 50` E `rating > 4.8`  
ENTÃO `send_whatsapp`  
→ produto entra na fila mesmo que o filtro padrão seja mais rígido.

## Ainda na Fase 2 (próximo)

- Multiusuário (admin / operador)
- Templates de posts / biblioteca
- Telegram e outros canais

## Fase 3 (depois)

- IA (OpenRouter)
- conversionReport (comissões reais)
- Analytics avançado
