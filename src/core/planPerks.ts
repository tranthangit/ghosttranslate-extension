// Benefits & limits shown in the extension's Account tab, keyed by plan id.
// Kept in sync with the web plans (lib/plans.ts). Device limits are also
// reported live by the worker, but these give users the full picture offline.

export interface PlanPerks {
  features: string[];
  limits: string[];
}

export const PLAN_PERKS: Record<string, PlanPerks> = {
  free: {
    features: ['Live translation', 'Auto language detection', 'Selection translate', 'Standard model'],
    limits: ['100 translations / day', '2 languages', '1 device'],
  },
  pro: {
    features: [
      'Unlimited translations',
      'All 39 languages',
      'Ghost Mode + AI continuation',
      'Rewrite & autocomplete',
      'Premium 70B model',
      'Priority latency',
    ],
    limits: ['Up to 2 devices'],
  },
  team: {
    features: [
      'Everything in Pro',
      'Shared tone presets',
      'Centralised billing',
      'Priority support',
    ],
    limits: ['Up to 5 devices per seat'],
  },
};

export function perksForPlan(plan?: string | null): PlanPerks | null {
  if (!plan) return null;
  return PLAN_PERKS[plan.toLowerCase()] ?? null;
}
