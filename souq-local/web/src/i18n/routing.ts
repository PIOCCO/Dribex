import { defineRouting } from "next-intl/routing";

export const locales = ["en", "fr", "ar"] as const;
export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "never",
  localeCookie: {
    name: "AZELOS_LOCALE",
    maxAge: 60 * 60 * 24 * 365,
  },
});
