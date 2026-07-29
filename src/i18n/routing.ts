export const routing = {
  locales: ["az", "en"],
  defaultLocale: "az",
} as const;

export type Locale = (typeof routing.locales)[number];
