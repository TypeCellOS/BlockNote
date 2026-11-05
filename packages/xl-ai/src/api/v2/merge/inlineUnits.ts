import { stableStringify } from "../blocks/json.js";
import {
  isLink,
  isStyledText,
  type LensInlineContent,
  type LensLink,
  type LensStyledText,
  type LensStyles,
} from "../blocks/types.js";
import { alignText, charKind, type TextUnit } from "../sequence/text.js";
import type { MatchedPair } from "../sequence/types.js";

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
 * - In the content of a group of blocks (see `merge/group.ts`), one unit
 *   at the start of each block: a break, with the ID of the block. A break
 *   of `theirs` is `changed` if another writer changed the fields of a block
 *   that the client removed. Thus, the merge sees a conflict there.
 */
export type InlineUnit =
  | {
      kind: "char";
      char: string;
      styles: LensStyles;
      href: string | undefined;
      shadow?: Shadow;
    }
  | { kind: "atom"; item: LensInlineContent; key: string }
  | { kind: "break"; id: string; changed: boolean };

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
    if (isStyledText(item) || isLink(item)) {
      const href = isLink(item) ? item.href : undefined;
      for (const styledText of isLink(item) ? item.content : [item]) {
        for (const char of styledText.text) {
          units.push({ kind: "char", char, styles: styledText.styles, href });
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

/**
 * Returns true if the units from `start` are all characters of one shadow,
 * in order, without a style or a link (a shadow starts without them, see
 * {@link toUnits}). If the text gave the characters a style or a link (for
 * example "**@Bob**" in markdown), they stay text with it.
 */
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
      unit.shadow.index !== k ||
      unit.href !== undefined ||
      Object.keys(unit.styles).length > 0
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
    if (unit.kind === "break") {
      throw new Error("The content of one block cannot contain a break");
    }
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

/**
 * Aligns two unit sequences (see `alignText`). The alignment does not compare
 * styles. The merge does that in a different step.
 *
 * Breaks (see {@link InlineUnit}) align by their place in the text, not by
 * their IDs. Thus, a block that starts at the same text is the same block,
 * also with a different ID: for example the first part of a split block, if
 * the second part keeps the ID.
 */
export function alignUnits(
  a: readonly InlineUnit[],
  b: readonly InlineUnit[],
): MatchedPair[] {
  return alignText(a.map(textUnitOf), b.map(textUnitOf));
}

function textUnitOf(unit: InlineUnit): TextUnit {
  // An atom key starts with "\u0000{", and a character key is one character.
  // Thus, the key of a break is different from the key of each other unit.
  return unit.kind === "char"
    ? { key: unit.char, kind: charKind(unit.char) }
    : {
        key: unit.kind === "atom" ? `\u0000${unit.key}` : "\u0000\u0001",
        kind: "other",
      };
}

/** Returns true if two units are the same: the same character with the same styles and link, the same atom, or a break of the same block, with the same `changed`. */
export function sameUnitWithStyles(a: InlineUnit, b: InlineUnit): boolean {
  if (a.kind === "char" && b.kind === "char") {
    return (
      a.char === b.char && a.href === b.href && sameStyles(a.styles, b.styles)
    );
  }
  if (a.kind === "break" && b.kind === "break") {
    return a.id === b.id && a.changed === b.changed;
  }
  return a.kind === "atom" && b.kind === "atom" && a.key === b.key;
}
