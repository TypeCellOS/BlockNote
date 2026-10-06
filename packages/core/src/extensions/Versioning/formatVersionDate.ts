// One formatter per locale: building an `Intl.DateTimeFormat` is the costly
// part, and history lists format a date per row on every render.
const formatters = new Map<string | undefined, Intl.DateTimeFormat>();

/**
 * A version's date and time as one string. A single formatter lets the locale
 * order and join the parts itself (e.g. "3 January 2024 at 9:44",
 * "3. Januar 2024 um 9:44"), rather than a hardcoded "date, time".
 * @param locale - Defaults to the browser's locale.
 */
export function formatVersionDate(timestamp: number, locale?: string): string {
  let formatter = formatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    formatters.set(locale, formatter);
  }
  return formatter.format(timestamp);
}
