// App-wide configuration — single source of truth for org-level display settings.
// Edit values here; helpers/components read from `appConfig`. Standalone (no alias
// imports) so it can be imported from anywhere, including utils.

export interface AppConfig {
  /** ISO 4217 currency code used for money formatting, e.g. 'PHP', 'USD'. */
  currency: string
  /** BCP 47 locale used for number/currency formatting, e.g. 'en-PH', 'en-US'. */
  locale: string
}

export const appConfig: AppConfig = {
  currency: 'PHP',
  locale: 'en-PH',
}
