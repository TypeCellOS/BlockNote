import { BlockNoteSchema, defaultStyleSpecs } from "@blocknote/core";
import { paragraph } from "../../../../core/src/blks/index.js";

// this is quite convoluted. we'll clean this up when we make
// it easier to extend / customize the default blocks

// remove textColor, backgroundColor from styleSpecs
const { textColor, backgroundColor, ...styleSpecs } = defaultStyleSpecs;

// the schema to use for comments
export const schema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: paragraph.definition(),
  },
  styleSpecs,
});
