import { deepEqual } from "../blocks/json.js";
import type { LensInlineContent, LensStyles } from "../blocks/types.js";
import { diff3, type RunContext, type StableTriple } from "./diff3.js";
import {
  alignUnits,
  fromUnits,
  type InlineUnit,
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
 * that the round trip changed). If not, ours wins. New text from ours gets
 * the hidden styles of the text around it (see {@link inheritHiddenStyles}).
 */
export function mergeInlineContent(
  base: readonly LensInlineContent[],
  ours: readonly LensInlineContent[],
  theirs: readonly LensInlineContent[],
  options: MergeOptions = {},
): LensInlineContent[] {
  const o = toUnits(base);
  const a = toUnits(ours);
  const b = toUnits(theirs);

  return fromUnits(
    diff3(o, a, b, alignUnits(o, a), alignUnits(o, b), {
      stable: (triple) => mergeStable(triple, options),
      ours: (units, context) =>
        units.map((unit) => inheritHiddenStyles(unit, context)),
      // The round trip can move whitespace across a style boundary (for
      // example "**bold **" becomes "**bold** "). Thus, whitespace does not
      // show the styles around it.
      isContext: ({ base }) => base.kind === "char" && !/\s/u.test(base.char),
      keepBothInserts: options.concurrent,
      conflict: options.onConflict,
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
    };
  }
  // An atom only matches an equal atom. Thus, the three are the same item.
  return theirs;
}

/**
 * New text from ours has no base or theirs for a merge. Thus, the merge uses
 * the nearest stable characters on the two sides (`context`) as the base and
 * theirs:
 *
 * - A style that the format does not show (for example underline in markdown)
 *   goes to the new text if the text on the two sides has it. Thus, new text
 *   at the edge of a styled run does not get the style. At the start or the
 *   end of the content, there is only one side, and the new text gets its
 *   style.
 * - A style that ours set to a different value than the base stays as ours
 *   sets it.
 */
function inheritHiddenStyles(
  unit: InlineUnit,
  { before, after }: RunContext<InlineUnit>,
): InlineUnit {
  if (unit.kind !== "char") {
    return unit;
  }
  const fromBefore = inheritFrom(unit, before ?? after);
  const fromAfter = inheritFrom(unit, after ?? before);
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
