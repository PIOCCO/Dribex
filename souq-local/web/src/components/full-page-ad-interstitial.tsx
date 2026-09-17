"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getPublicApiBaseUrl } from "@/lib/config";
import {
  fullPageAdContextKey,
  isFullPageAdCooldownActive,
  readFullPageAdSession,
  writeFullPageAdSession,
} from "@/lib/full-page-ad-session";
import { resolveMediaUrl } from "@/lib/media";
import { safeExternalHref } from "@/lib/security";
import type { PlatformAdvertisement } from "@/lib/types";

type FullPageAdInterstitialProps = {
  ad: PlatformAdvertisement;
  onClose: () => void;
};

function viewerStorageKey(): string {
  if (typeof window === "undefined") return "anonymous";
  const existing = window.localStorage.getItem("dribex-ad-viewer");
  if (existing) return existing;
  const created =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `viewer-${Date.now()}`;
  window.localStorage.setItem("dribex-ad-viewer", created);
  return created;
}

function generateViewKey(campaignId: string): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `view-${campaignId}-${crypto.randomUUID()}`
    : `view-${campaignId}-${Date.now()}`;
}

function normalizeCloseDelaySeconds(ad: PlatformAdvertisement): number {
  const raw = ad.close_delay_seconds;
  if (raw === 10 || raw === 20) return raw;
  return 5;
}

function marketplaceSlugFromPathname(pathname: string): string | null {
  const match = pathname.match(/\/marketplaces\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]).trim().toLowerCase() || null;
  } catch {
    return match[1].trim().toLowerCase() || null;
  }
}

export function FullPageAdInterstitial({ ad, onClose }: FullPageAdInterstitialProps) {
  const t = useTranslations("ads");
  const closeDelaySeconds = normalizeCloseDelaySeconds(ad);
  const closeDelayMs = closeDelaySeconds * 1000;
  const [closeAllowed, setCloseAllowed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(closeDelaySeconds);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const impressionSent = useRef(false);
  const viewKey = useMemo(() => generateViewKey(ad.id), [ad.id]);

  const imageUrl = resolveMediaUrl(ad.image_url);
  const videoUrl = ad.video_url ? resolveMediaUrl(ad.video_url) : null;
  const hasDestination = Boolean(ad.target_url?.trim() && safeExternalHref(ad.target_url));

  const clickHref = useMemo(() => {
    if (!hasDestination || !ad.click_url) return null;
    if (ad.click_url.startsWith("/")) {
      return `${getPublicApiBaseUrl()}${ad.click_url}`;
    }
    return ad.click_url.startsWith("http") ? ad.click_url : null;
  }, [ad.click_url, hasDestination]);

  const dismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (impressionSent.current) return;
    impressionSent.current = true;
    const viewer = viewerStorageKey();
    void apiFetch(
      "/ads/impressions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Ad-Viewer": viewer,
        },
        body: JSON.stringify({
          campaign_id: ad.id,
          placement: "full_page",
          view_key: viewKey,
        }),
      },
      "client",
    ).catch(() => {});
  }, [ad.id, viewKey]);

  useEffect(() => {
    setSecondsLeft(closeDelaySeconds);
    setCloseAllowed(false);
    const closeTimer = window.setTimeout(() => {
      setCloseAllowed(true);
      setSecondsLeft(0);
    }, closeDelayMs);

    const tick = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      window.clearTimeout(closeTimer);
      window.clearInterval(tick);
    };
  }, [ad.id, closeDelayMs, closeDelaySeconds]);

  useEffect(() => {
    if (!mediaFailed) return;
    dismiss();
  }, [mediaFailed, dismiss]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    video.muted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => setMediaFailed(true));
    }
  }, [videoUrl]);

  const handleClose = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!closeAllowed) return;
    dismiss();
  };

  const handleAdClick = () => {
    if (!clickHref) return;
    window.open(clickHref, "_blank", "noopener,noreferrer");
  };

  const toggleMute = (event: React.MouseEvent) => {
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const next = !videoMuted;
    video.muted = next;
    setVideoMuted(next);
  };

  if (!imageUrl && !videoUrl) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={t("fullPageAriaLabel")}
    >
      <div
        className={`relative flex h-full w-full max-h-[100dvh] flex-col ${clickHref ? "cursor-pointer" : ""}`}
        onClick={clickHref ? handleAdClick : undefined}
        onKeyDown={undefined}
      >
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="h-full w-full object-contain"
            playsInline
            autoPlay
            muted={videoMuted}
            loop
            onError={() => setMediaFailed(true)}
          />
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={ad.title}
            className="h-full w-full object-contain"
            onError={() => setMediaFailed(true)}
          />
        ) : null}

        {videoUrl ? (
          <button
            type="button"
            className="absolute left-3 top-3 z-20 rounded-full bg-black/60 px-3 py-2 text-sm text-white"
            onClick={toggleMute}
            aria-label={videoMuted ? t("unmute") : t("mute")}
          >
            {videoMuted ? t("unmute") : t("mute")}
          </button>
        ) : null}

        {closeAllowed ? (
          <button
            type="button"
            className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-xl leading-none text-white"
            onClick={handleClose}
            aria-label={t("close")}
          >
            ×
          </button>
        ) : (
          <div
            className="absolute right-3 top-3 z-20 min-w-[2.25rem] rounded-full bg-black/60 px-3 py-2 text-center text-sm font-semibold text-white"
            aria-live="polite"
          >
            {secondsLeft}
          </div>
        )}

        {ad.title ? (
          <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 rounded-xl bg-black/60 px-4 py-3 text-center text-white">
            <p className="font-semibold">{ad.title}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FullPageAdHost() {
  const pathname = usePathname();
  const [ad, setAd] = useState<PlatformAdvertisement | null>(null);
  const fetchGeneration = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (ad) return;

    const generation = ++fetchGeneration.current;
    const marketplaceSlug = marketplaceSlugFromPathname(pathname);
    const contextKey = fullPageAdContextKey(marketplaceSlug);
    const session = readFullPageAdSession(contextKey);
    if (isFullPageAdCooldownActive(session)) return;

    const viewer = viewerStorageKey();
    const exclude = session.shownCampaignIds.join(",");
    const params = new URLSearchParams({
      placement: "full_page",
      platform: "web",
      limit: "1",
    });
    if (marketplaceSlug) {
      params.set("marketplace_slug", marketplaceSlug);
    }
    if (exclude) {
      params.set("exclude_campaign_ids", exclude);
    }

    void apiFetch<PlatformAdvertisement[]>(
      `/ads/active?${params.toString()}`,
      {
        headers: { "X-Ad-Viewer": viewer },
      },
      "client",
    )
      .then((rows) => {
        if (generation !== fetchGeneration.current) return;
        const candidate = rows[0];
        if (!candidate) return;
        setAd(candidate);
      })
      .catch(() => {
        // Never block the storefront when ads fail.
      });
  }, [pathname, ad]);

  const handleClose = useCallback(() => {
    if (!ad) {
      setAd(null);
      return;
    }
    const marketplaceSlug = marketplaceSlugFromPathname(pathname);
    const contextKey = fullPageAdContextKey(marketplaceSlug);
    const session = readFullPageAdSession(contextKey);
    const shown = new Set(session.shownCampaignIds);
    shown.add(ad.id);
    writeFullPageAdSession(contextKey, {
      shownCampaignIds: [...shown],
      lastDismissedAt: Date.now(),
    });
    setAd(null);
  }, [ad, pathname]);

  if (!ad) return null;

  return <FullPageAdInterstitial ad={ad} onClose={handleClose} />;
}
