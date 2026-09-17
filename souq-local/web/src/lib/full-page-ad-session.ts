const COOLDOWN_MS = 3 * 60 * 1000;

export type FullPageAdSessionState = {
  shownCampaignIds: string[];
  lastDismissedAt: number | null;
};

function storageKey(contextKey: string): string {
  return `dribex-full-page-ad-session:${contextKey}`;
}

export function fullPageAdContextKey(marketplaceSlug?: string | null): string {
  const slug = (marketplaceSlug ?? "").trim().toLowerCase();
  return slug || "__all__";
}

export function readFullPageAdSession(contextKey: string): FullPageAdSessionState {
  if (typeof window === "undefined") {
    return { shownCampaignIds: [], lastDismissedAt: null };
  }
  try {
    const raw = window.sessionStorage.getItem(storageKey(contextKey));
    if (!raw) return { shownCampaignIds: [], lastDismissedAt: null };
    const parsed = JSON.parse(raw) as FullPageAdSessionState;
    return {
      shownCampaignIds: Array.isArray(parsed.shownCampaignIds)
        ? parsed.shownCampaignIds.filter((id) => typeof id === "string")
        : [],
      lastDismissedAt:
        typeof parsed.lastDismissedAt === "number" ? parsed.lastDismissedAt : null,
    };
  } catch {
    return { shownCampaignIds: [], lastDismissedAt: null };
  }
}

export function writeFullPageAdSession(
  contextKey: string,
  session: FullPageAdSessionState,
): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(storageKey(contextKey), JSON.stringify(session));
}

export function isFullPageAdCooldownActive(session: FullPageAdSessionState): boolean {
  if (session.lastDismissedAt == null) return false;
  return Date.now() - session.lastDismissedAt < COOLDOWN_MS;
}

export { COOLDOWN_MS as fullPageInterstitialCooldownMs };
