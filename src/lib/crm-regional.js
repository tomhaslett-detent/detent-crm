export const crmCurrencies = ["GBP", "EUR", "USD", "AUD", "CAD", "NZD", "CHF", "JPY", "SEK", "NOK", "DKK", "SGD", "INR", "ZAR"];
export const crmLocales = [
  ["en-GB", "English (UK)"], ["en-US", "English (US)"], ["en-AU", "English (Australia)"],
  ["en-CA", "English (Canada)"], ["en-NZ", "English (New Zealand)"], ["en-IE", "English (Ireland)"],
  ["fr-FR", "French (France)"], ["de-DE", "German (Germany)"], ["es-ES", "Spanish (Spain)"],
  ["it-IT", "Italian (Italy)"], ["nl-NL", "Dutch (Netherlands)"], ["pt-PT", "Portuguese (Portugal)"],
  ["ja-JP", "Japanese (Japan)"], ["en-IN", "English (India)"], ["en-ZA", "English (South Africa)"],
];
export const defaultRegion = { locale: "en-GB", time_zone: "Europe/London", currency: "EUR" };
export const regionalZones = ["UTC", ...Intl.supportedValuesOf("timeZone")];

export function dateForRegion(value, region = defaultRegion, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Intl.DateTimeFormat(region.locale, {
    dateStyle: "medium",
    ...(!dateOnly && includeTime ? { timeStyle: "short" } : {}),
    timeZone: dateOnly ? "UTC" : region.time_zone,
  }).format(date);
}

export function moneyForRegion(value, currency, region = defaultRegion, compact = false) {
  if (value === undefined || value === null || value === "" || !Number.isFinite(Number(value)) || !crmCurrencies.includes(currency)) return "—";
  return new Intl.NumberFormat(region.locale, {
    style: "currency", currency, currencyDisplay: "code",
    ...(compact ? { notation: "compact", maximumFractionDigits: 1 } : {}),
  }).format(Number(value));
}

export function currencyTotals(deals) {
  const totals = new Map();
  for (const { currency, value } of deals) {
    if (!crmCurrencies.includes(currency) || value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) continue;
    totals.set(currency, (totals.get(currency) ?? 0) + Number(value));
  }
  return [...totals].sort(([a], [b]) => a.localeCompare(b, "en-GB"));
}
