import { stableStringify } from "../blocks/json.js";
import {
  isLink,
  isStyledText,
  type LensInlineContent,
  type LensLink,
  type LensStyledText,
  type LensStyles,
} from "../blocks/types.js";
import { myersMatch } from "../diff/myers.js";
import type { MatchedPair } from "../diff/types.js";

/**
 * Inline content as a flat sequence of units:
 *
 * - One unit for each character, with its styles and link. A character is a
 *   code point. Thus, a unit never contains half of a surrogate pair.
 * - One unit for each item of custom inline content, for example a mention.
 *   The merge compares this unit as one item.
 * - With `shadowOf`, an item that the format shows as text is the characters
 *   of that text, its shadow (see `MergeOptions.shadowOf`). Each character
 *   knows its item. If all characters of a shadow stay, {@link fromUnits}
 *   gives back the item.
 */
export type InlineUnit =
  | {
      kind: "char";
      char: string;
      styles: LensStyles;
      href: string | undefined;
      shadow?: Shadow;
    }
  | { kind: "atom"; item: LensInlineContent; key: string };

/** A character of the shadow of an item: the item, the shadow (`id`), and the index of the character in the shadow. */
type Shadow = {
  item: LensInlineContent;
  id: number;
  index: number;
  length: number;
};

export function toUnits(
  content: readonly LensInlineContent[],
  shadowOf?: (item: LensInlineContent) => string | undefined,
): InlineUnit[] {
  const units: InlineUnit[] = [];
  let shadows = 0;
  for (const item of content) {
    if (isStyledText(item)) {
      for (const char of item.text) {
        units.push({
          kind: "char",
          char,
          styles: item.styles,
          href: undefined,
        });
      }
    } else if (isLink(item)) {
      for (const styledText of item.content) {
        for (const char of styledText.text) {
          units.push({
            kind: "char",
            char,
            styles: styledText.styles,
            href: item.href,
          });
        }
      }
    } else {
      const chars = Array.from(shadowOf?.(item) ?? "");
      if (chars.length === 0) {
        units.push({ kind: "atom", item, key: stableStringify(item) });
        continue;
      }
      const id = shadows++;
      chars.forEach((char, index) => {
        units.push({
          kind: "char",
          char,
          styles: {},
          href: undefined,
          shadow: { item, id, index, length: chars.length },
        });
      });
    }
  }
  return units;
}

/** Returns true if the units from `start` are all characters of one shadow, in order. */
function isFullShadow(units: readonly InlineUnit[], start: number): boolean {
  const first = units[start];
  if (first.kind !== "char" || first.shadow?.index !== 0) {
    return false;
  }
  const { id, length } = first.shadow;
  for (let k = 0; k < length; k++) {
    const unit = units[start + k];
    if (
      unit?.kind !== "char" ||
      unit.shadow?.id !== id ||
      unit.shadow.index !== k
    ) {
      return false;
    }
  }
  return true;
}

/**
 * The inverse of {@link toUnits}. Puts adjacent characters with equal styles
 * and link in one item. A full shadow gives back its item. The characters of
 * a shadow that is not full (the text changed it) stay text.
 */
export function fromUnits(units: readonly InlineUnit[]): LensInlineContent[] {
  const content: LensInlineContent[] = [];
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    if (unit.kind === "atom") {
      content.push(unit.item);
      continue;
    }
    if (unit.shadow !== undefined && isFullShadow(units, i)) {
      content.push(unit.shadow.item);
      i += unit.shadow.length - 1;
      continue;
    }

    const texts =
      unit.href === undefined ? content : linkTexts(content, unit.href);
    const last = texts.at(-1);
    if (
      last !== undefined &&
      isStyledText(last) &&
      sameStyles(last.styles, unit.styles)
    ) {
      last.text += unit.char;
    } else {
      texts.push({ type: "text", text: unit.char, styles: unit.styles });
    }
  }
  return content;
}

/** Returns the texts of the last item of `content`, if it is a link with the `href`. If not, adds a link with the `href` first. */
function linkTexts(
  content: LensInlineContent[],
  href: string,
): LensStyledText[] {
  const last = content.at(-1);
  if (last !== undefined && isLink(last) && last.href === href) {
    return last.content;
  }
  const link: LensLink = { type: "link", href, content: [] };
  content.push(link);
  return link.content;
}

function sameStyles(a: LensStyles, b: LensStyles) {
  return stableStringify(a) === stableStringify(b);
}

/** Returns true if two units have the same character or the same atom. This does not compare styles. */
function sameUnit(a: InlineUnit, b: InlineUnit): boolean {
  if (a.kind === "char" && b.kind === "char") {
    return a.char === b.char;
  }
  if (a.kind === "atom" && b.kind === "atom") {
    return a.key === b.key;
  }
  return false;
}

/**
 * The minimum part of a gap between matched tokens that character matches must
 * cover. If the matches cover less, the alignment does not use them. These
 * characters are the same only by chance, for example in a new sentence. Their
 * old styles must not go to random characters of the new text.
 */
const MIN_GAP_MATCH_RATIO = 0.5;

/**
 * Aligns two unit sequences in two steps:
 *
 * 1. By tokens: words and single other characters, without whitespace. Thus,
 *    a word matches at each position, also at the end of the text.
 * 2. By characters, in the gaps between matched tokens. Thus, whitespace
 *    matches only between matched tokens.
 *
 * The alignment does not compare styles. The merge does that in a different step.
 */
export function alignUnits(
  a: readonly InlineUnit[],
  b: readonly InlineUnit[],
): MatchedPair[] {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  const tokenPairs = myersMatch(tokensA, tokensB, (x, y) => x.key === y.key);

  const pairs: MatchedPair[] = [];
  let aPos = 0;
  let bPos = 0;
  for (const tokenPair of tokenPairs) {
    const tokenA = tokensA[tokenPair.aIndex];
    const tokenB = tokensB[tokenPair.bIndex];
    pairs.push(...alignGap(a, b, aPos, tokenA.start, bPos, tokenB.start));
    for (let k = 0; k < tokenA.end - tokenA.start; k++) {
      pairs.push({ aIndex: tokenA.start + k, bIndex: tokenB.start + k });
    }
    aPos = tokenA.end;
    bPos = tokenB.end;
  }
  pairs.push(...alignGap(a, b, aPos, a.length, bPos, b.length));
  return pairs;
}

function alignGap(
  a: readonly InlineUnit[],
  b: readonly InlineUnit[],
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): MatchedPair[] {
  const gapLength = aEnd - aStart + (bEnd - bStart);
  if (aStart === aEnd || bStart === bEnd) {
    return [];
  }
  const matches = myersMatch(
    a.slice(aStart, aEnd),
    b.slice(bStart, bEnd),
    sameUnit,
  );
  if (2 * matches.length < MIN_GAP_MATCH_RATIO * gapLength) {
    return [];
  }
  return matches.map((pair) => ({
    aIndex: aStart + pair.aIndex,
    bIndex: bStart + pair.bIndex,
  }));
}

type Token = { start: number; end: number; key: string };

const WORD_CHAR = /[\p{L}\p{N}_]/u;
const WHITESPACE_CHAR = /\s/u;

function charClass(unit: InlineUnit): "word" | "space" | "other" {
  if (unit.kind === "atom") {
    return "other";
  }
  if (WORD_CHAR.test(unit.char)) {
    return "word";
  }
  return WHITESPACE_CHAR.test(unit.char) ? "space" : "other";
}

function unitKey(unit: InlineUnit) {
  return unit.kind === "char" ? unit.char : `\u0000${unit.key}`;
}

/** Makes tokens: a run of word characters, or one other unit. Whitespace is not in a token. */
function tokenize(units: readonly InlineUnit[]): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < units.length) {
    const kind = charClass(units[i]);
    let end = i + 1;
    if (kind === "word") {
      while (end < units.length && charClass(units[end]) === "word") {
        end++;
      }
    }
    if (kind !== "space") {
      tokens.push({
        start: i,
        end,
        key: units.slice(i, end).map(unitKey).join(""),
      });
    }
    i = end;
  }
  return tokens;
}

/** Returns true if two units are the same: the same character with the same styles and link, or the same atom. */
export function sameUnitWithStyles(a: InlineUnit, b: InlineUnit): boolean {
  if (a.kind === "char" && b.kind === "char") {
    return (
      a.char === b.char && a.href === b.href && sameStyles(a.styles, b.styles)
    );
  }
  return sameUnit(a, b);
}
