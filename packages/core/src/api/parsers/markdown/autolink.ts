const AUTOLINK_LITERAL_PREFIX = /^(https?:\/\/|www\.)/i;

export function isGfmAutolinkLiteral(value: string): boolean {
  const prefix = value.match(AUTOLINK_LITERAL_PREFIX);
  if (!prefix) {
    return false;
  }

  const domain = value.substring(prefix[0].length).split(/[/?#:\s]/, 1)[0];
  const segments = domain.split(".");
  if (
    segments.length < 2 ||
    segments.some((segment) => !/^[a-zA-Z0-9_-]+$/.test(segment))
  ) {
    return false;
  }

  return segments.slice(-2).every((segment) => !segment.includes("_"));
}

export function getGfmAutolinkLiteralHref(value: string): string | undefined {
  if (!isGfmAutolinkLiteral(value)) {
    return undefined;
  }
  return /^www\./i.test(value) ? `http://${value}` : value;
}

export function trimGfmAutolinkLiteral(value: string): string {
  let trimmed = value.replace(/[?!.,:*_~]+$/, "");
  trimmed = trimmed.replace(/&[a-zA-Z0-9]+;$/, "");
  if (!trimmed.endsWith(")")) {
    return trimmed;
  }

  const openingCount = trimmed.split("(").length - 1;
  const closingCount = trimmed.split(")").length - 1;
  const surplusClosingCount = Math.max(0, closingCount - openingCount);
  const trailingClosingCount = trimmed.match(/\)+$/)?.[0].length ?? 0;
  const removeCount = Math.min(surplusClosingCount, trailingClosingCount);

  return removeCount === 0 ? trimmed : trimmed.slice(0, -removeCount);
}
