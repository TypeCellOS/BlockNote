import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";

// TODO: disable props on paragraph
export const schema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
  },
});
