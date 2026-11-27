export function formatLinkDestination(
  destination: string,
  forceAngle = false,
): string {
  // Even angle-bracket destinations cannot contain line endings. Encode
  // control whitespace so the destination works in other Markdown readers.
  const url = destination
    .replace(/[\t\n\r]/g, encodeURIComponent)
    .replace(/[\\()<>]/g, "\\$&");
  return forceAngle || /[ <>]/.test(url) || url !== url.trim()
    ? `<${url}>`
    : url;
}
