import type { LensBlock } from "../model.js";
import type { SchemaRules } from "../util/blocks/index.js";
import { fitLayout } from "./fitLayout.js";
import { fitChangedTables } from "./fitTable.js";

/**
 * Stage 5 (Fit): the result fits the schema. Else ProseMirror or the table
 * plugin adds blocks or cells that the text did not ask for.
 *
 * - The layout blocks fit their child rules (see `fitLayout`), unless
 *   `keepLayout` is set. The fit applies to the result, not to the target:
 *   in the current document, a layout block can have blocks of other writers
 *   (for example a column that another writer added), which the target does
 *   not have.
 * - Each table that the write changed fits the rules of a table (see
 *   `fitChangedTables`).
 */
export function fitResult(
  rules: SchemaRules,
  blocks: readonly LensBlock[],
  current: readonly LensBlock[],
  /** Keep the layout blocks, also if they become empty (for `merge: "yjs"`). */
  keepLayout: boolean,
): LensBlock[] {
  return fitChangedTables(
    keepLayout
      ? blocks
      : fitLayout(blocks, rules.layoutRuleOf, rules.canContain),
    current,
  );
}
