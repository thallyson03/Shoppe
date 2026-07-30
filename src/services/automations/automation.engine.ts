/**
 * Engine de regras de automação (Fase 2).
 * Avalia condições SE/ENTÃO sobre ofertas normalizadas.
 */

import { prisma } from '../../database/prisma.js';
import type { NormalizedOffer } from '../../models/offer.model.js';
import { logger } from '../../utils/logger.js';

export type RuleField = 'discount' | 'rating' | 'commission' | 'sales' | 'price';
export type RuleOp = 'gt' | 'gte' | 'lt' | 'lte' | 'eq';

export interface RuleCondition {
  field: RuleField;
  op: RuleOp;
  value: number;
}

export interface AutomationMatch {
  ruleId: string;
  ruleName: string;
  action: string;
  groupId: string | null;
}

function readField(offer: NormalizedOffer, field: RuleField): number | null {
  switch (field) {
    case 'discount':
      return offer.priceDiscountRate ?? null;
    case 'rating':
      return offer.ratingStar ?? null;
    case 'commission':
      // regras usam % (ex: 15 = 15%), oferta guarda decimal (0.15)
      return offer.commissionRate != null ? offer.commissionRate * 100 : null;
    case 'sales':
      return offer.sales ?? null;
    case 'price':
      return offer.priceMin ?? null;
    default:
      return null;
  }
}

function compare(actual: number, op: RuleOp, expected: number): boolean {
  switch (op) {
    case 'gt':
      return actual > expected;
    case 'gte':
      return actual >= expected;
    case 'lt':
      return actual < expected;
    case 'lte':
      return actual <= expected;
    case 'eq':
      return actual === expected;
    default:
      return false;
  }
}

export class AutomationEngine {
  /**
   * Retorna ofertas que devem entrar na fila por regra (send_whatsapp / boost),
   * mesmo que o filtro padrão tenha rejeitado.
   */
  async selectForcedOffers(offers: NormalizedOffer[]): Promise<{
    forced: NormalizedOffer[];
    skippedIds: Set<string>;
    matches: Map<string, AutomationMatch[]>;
  }> {
    const rules = await prisma.automationRule.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    const forced: NormalizedOffer[] = [];
    const skippedIds = new Set<string>();
    const matches = new Map<string, AutomationMatch[]>();
    const forcedIds = new Set<string>();

    if (rules.length === 0) {
      return { forced, skippedIds, matches };
    }

    for (const offer of offers) {
      for (const rule of rules) {
        const conditions = (rule.conditions as unknown as RuleCondition[]) ?? [];
        if (!Array.isArray(conditions) || conditions.length === 0) continue;

        const results = conditions.map((c) => {
          const actual = readField(offer, c.field);
          if (actual == null) return false;
          return compare(actual, c.op, Number(c.value));
        });

        const ok =
          rule.logic === 'or' ? results.some(Boolean) : results.every(Boolean);

        if (!ok) continue;

        const match: AutomationMatch = {
          ruleId: rule.id,
          ruleName: rule.name,
          action: rule.action,
          groupId: rule.groupId,
        };

        const list = matches.get(offer.itemId) ?? [];
        list.push(match);
        matches.set(offer.itemId, list);

        if (rule.action === 'skip') {
          skippedIds.add(offer.itemId);
        }

        if (
          (rule.action === 'send_whatsapp' || rule.action === 'boost') &&
          !forcedIds.has(offer.itemId) &&
          !skippedIds.has(offer.itemId)
        ) {
          forced.push(offer);
          forcedIds.add(offer.itemId);
        }
      }
    }

    logger.info(
      {
        rules: rules.length,
        forced: forced.length,
        skipped: skippedIds.size,
      },
      'Automações avaliadas',
    );

    return { forced, skippedIds, matches };
  }
}
