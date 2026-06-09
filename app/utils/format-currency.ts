import { appConfig } from '../lib/config/app'

/**
 * Formats a numeric amount as a localized currency string.
 * Defaults come from `app/lib/config/app.ts`; pass overrides to format in a
 * different currency/locale for a specific case.
 */
export function formatCurrency(
  amount: number,
  currency: string = appConfig.currency,
  locale: string = appConfig.locale,
): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}
