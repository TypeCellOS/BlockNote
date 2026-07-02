import {
  BlockNoteEditor,
  BlockNoteSchema,
  PartialBlock,
  withPageBreak,
} from "@blocknote/core";
import { withMultiColumn } from "@blocknote/xl-multi-column";

/**
 * The gallery's editor schema: the default blocks plus `pageBreak` and
 * multi-column (`columnList` / `column`) so scenarios can exercise those block
 * types and load the shared `testDocument`. It's a superset of the default
 * schema, so every existing scenario keeps working. The gallery editors AND the
 * shared test fixtures both build on this so the two never drift.
 */
export const gallerySchema = withMultiColumn(
  withPageBreak(BlockNoteSchema.create()),
);

type GallerySchema = typeof gallerySchema;

/** A `BlockNoteEditor` typed for the gallery schema (columns + page break). */
export type GalleryEditor = BlockNoteEditor<
  GallerySchema["blockSchema"],
  GallerySchema["inlineContentSchema"],
  GallerySchema["styleSchema"]
>;

/** A `PartialBlock` typed for the gallery schema. */
export type GalleryPartialBlock = PartialBlock<
  GallerySchema["blockSchema"],
  GallerySchema["inlineContentSchema"],
  GallerySchema["styleSchema"]
>;
