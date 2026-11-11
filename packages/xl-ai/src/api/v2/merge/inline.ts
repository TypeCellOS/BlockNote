import type { LensInlineContent, LensStyles } from "../model.js";
import { deepEqual } from "../util/blocks/index.js";
import { diff3, type RunContext, type StableTriple } from "./diff3.js";
import {
  alignUnits,
  fromUnits,
  type InlineUnit,
  sameUnitWithStyles,
  toUnits,
} from "./inlineUnits.js";
import { type MergeOptions, mergeRecords, mergeValue } from "./threeWay.js";

/**
 * Three-way merge (diff3) of inline content, character by character (see
 * `threeWay.ts` for the vocabulary).
 *
 * Characters that are in the three keep their position. {@link mergeValue}
 * merges their styles and link. Thus, styles that the format does not show
 * stay, for example underline in markdown.
 *
 * Between these stable characters, the side that changed wins. If only
 * theirs is different from the base, theirs wins (for example whitespace
 * that the round trip changed). If the two sides changed the same part, ours
 * wins, and in the tree merge theirs wins (see `MergeOptions`). New text from
 * ours gets the hidden styles of the text around it (see
 * {@link inheritHiddenStyles}).
 *
 * Method: diff3, a standard algorithm, on our own units (the characters and the
 * inline items, see `inlineUnits.ts`), aligned by `alignText`.
 *
 * @internal
 */
export function mergeInlineContent(
  base: readonly LensInlineContent[],
  ours: readonly LensInlineContent[],
  theirs: readonly LensInlineContent[],
  options: MergeOptions = {},
): LensInlineContent[] {
  const o = toUnits(base);
  const a = toUnits(ours);
  const b = toUnits(theirs, options.shadowOf);

  return fromUnits(
    diff3(o, a, b, alignUnits(o, a), alignUnits(o, b), {
      stable: (triple) => mergeStable(triple, options),
      ours: (units, context) => {
        // The styles of the replaced text, one time for the run.
        const old = commonOf(context.replaced.base, context.replaced.theirs);
        return units.map((unit) => inheritHiddenStyles(unit, context, old));
      },
      // The round trip can move whitespace across a style boundary (for
      // example "**bold **" becomes "**bold** "). Thus, whitespace does not
      // show the styles around it.
      isContext: ({ base }) => base.kind === "char" && !/\s/u.test(base.char),
      // Two writers add text at one position: the text that applied first
      // (of the other writer) stays first. Thus, two additions at the end
      // read in the order of the writes. (The tree merge puts the blocks of
      // the client first, see `merge/tree.ts`.)
      keepBothInserts: options.concurrent ? "theirs-first" : undefined,
      // In the target stage, an item of theirs without a base unit is an item that
      // the format does not show (for example a mention in plain text). The
      // text cannot remove it, thus it stays. Whitespace is not an item: the
      // format can change it.
      keepTheirs: options.concurrent
        ? undefined
        : (unit) => unit.kind === "atom",
      conflict: options.onConflict,
      conflictWinner: options.concurrent ? "theirs" : "ours",
      // The alignment pairs characters without their styles. Thus, a
      // character with a changed style is a change.
      same: sameUnitWithStyles,
    }),
  );
}

function mergeStable(
  { base, ours, theirs }: StableTriple<InlineUnit>,
  options: MergeOptions,
): InlineUnit {
  if (base.kind === "char" && ours.kind === "char" && theirs.kind === "char") {
    return {
      kind: "char",
      char: ours.char,
      styles: mergeRecords(base.styles, ours.styles, theirs.styles, options),
      href: mergeValue(base.href, ours.href, theirs.href, options),
      shadow: theirs.shadow,
    };
  }
  // An atom only matches an equal atom. Thus, the three are the same item.
  return theirs;
}

/**
 * New text from ours has no base or theirs for a merge. Thus, the merge uses
 * a context as the base and theirs, to give the new text the styles and the
 * link that the format does not show (for example underline in markdown):
 *
 * - New text that replaces old text uses the styles and the link that all
 *   the old text has. Thus, a changed word keeps the hidden styles of the
 *   word that it replaces.
 * - Inserted text uses the nearest stable characters on the two sides. It
 *   gets a style or a link only if the two sides have it. Thus, new text at
 *   the edge of a styled run, or at the start or the end of the content,
 *   does not get the style.
 *
 * A style that ours set to a different value than the base stays as ours
 * sets it.
 */
function inheritHiddenStyles(
  unit: InlineUnit,
  { before, after }: RunContext<InlineUnit>,
  /** The styles of the replaced text (see {@link commonOf}). */
  old: StableTriple<InlineUnit> | undefined,
): InlineUnit {
  if (unit.kind !== "char") {
    return unit;
  }
  const sides = (old !== undefined ? [old, old] : [before, after]).map(
    (context) => inheritFrom(unit, context),
  );
  const [fromBefore, fromAfter] = sides;
  if (fromBefore === undefined || fromAfter === undefined) {
    return unit;
  }

  const styles: LensStyles = {};
  for (const key of new Set([
    ...Object.keys(fromBefore.styles),
    ...Object.keys(fromAfter.styles),
  ])) {
    const value =
      fromBefore.styles[key] === fromAfter.styles[key]
        ? fromBefore.styles[key]
        : unit.styles[key];
    if (value !== undefined) {
      styles[key] = value;
    }
  }
  return {
    kind: "char",
    char: unit.char,
    styles,
    href: deepEqual(fromBefore.href, fromAfter.href)
      ? fromBefore.href
      : unit.href,
  };
}

/**
 * The styles and the link that all characters of the replaced base and of
 * the replaced theirs have, as one triple. Whitespace does not count (see
 * `isContext`). `undefined` if a side has no such character.
 */
function commonOf(
  base: readonly InlineUnit[],
  theirs: readonly InlineUnit[],
): StableTriple<InlineUnit> | undefined {
  const common = (units: readonly InlineUnit[]) => {
    const chars = units.filter(
      (unit): unit is InlineUnit & { kind: "char" } =>
        unit.kind === "char" && !/\s/u.test(unit.char),
    );
    if (chars.length === 0) {
      return undefined;
    }
    const styles: LensStyles = {};
    for (const [key, value] of Object.entries(chars[0].styles)) {
      if (chars.every((char) => char.styles[key] === value)) {
        styles[key] = value;
      }
    }
    const { href } = chars[0];
    const unit: InlineUnit = {
      kind: "char",
      char: "",
      styles,
      href: chars.every((char) => char.href === href) ? href : undefined,
    };
    return unit;
  };
  const baseUnit = common(base);
  const theirsUnit = common(theirs);
  return baseUnit === undefined || theirsUnit === undefined
    ? undefined
    : { base: baseUnit, ours: baseUnit, theirs: theirsUnit };
}

/** The styles and link of the new character, merged with one stable character as the base and theirs. */
function inheritFrom(
  unit: InlineUnit & { kind: "char" },
  context: StableTriple<InlineUnit> | undefined,
): { styles: LensStyles; href: string | undefined } | undefined {
  if (context?.base.kind !== "char" || context.theirs.kind !== "char") {
    return undefined;
  }
  return {
    styles: mergeRecords(
      context.base.styles,
      unit.styles,
      context.theirs.styles,
    ),
    href: mergeValue(context.base.href, unit.href, context.theirs.href),
  };
}
