import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";

// Simplified schema without media, file, and table blocks.
export const schema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
    heading: defaultBlockSpecs.heading,
    bulletListItem: defaultBlockSpecs.bulletListItem,
    numberedListItem: defaultBlockSpecs.numberedListItem,
    checkListItem: defaultBlockSpecs.checkListItem,
  },
});

export type TextBlockSchema = typeof schema.blockSchema;
