"use client";

import type { UserTier } from "@/types/index";

/** Entitlement bypassed — everyone is premium */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useEntitlement(userId?: string) {
  const tier: UserTier = "premium";

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isEntitled = (isPremium: boolean) => true;

  return { tier, loading: false, isEntitled };
}
