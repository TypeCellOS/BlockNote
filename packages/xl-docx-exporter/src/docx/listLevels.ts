/**
 * The number of levels defined for the `blocknote-numbered-list` and
 * `blocknote-bullet-list` numbering configs in
 * `DOCXExporter.createDefaultDocumentOptions`.
 *
 * OOXML numbering definitions cap out at 9 levels (`w:ilvl` 0-8), which is also
 * the nesting limit Word itself exposes.
 */
export const DOCX_LIST_LEVEL_COUNT = 9;

/**
 * Clamps a block's nesting level to the deepest list level the numbering config
 * actually defines.
 *
 * BlockNote allows lists to nest arbitrarily deep, so a `nestingLevel` can
 * exceed what DOCX supports. Passing such a level straight through makes `docx`
 * throw ("Level cannot be greater than 9"), which aborts the whole export, and
 * a level with no matching definition renders without its bullet or indent.
 * Deeper items are rendered at the deepest defined level instead, matching how
 * Word collapses nesting past its own limit.
 */
export function clampListLevel(nestingLevel: number) {
  return Math.min(nestingLevel, DOCX_LIST_LEVEL_COUNT - 1);
}
