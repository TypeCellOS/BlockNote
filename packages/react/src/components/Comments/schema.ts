import {
  BlockNoteSchema,
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
  defaultBlockSpecs,
  defaultStyleSpecs,
} from "@blocknote/core";
import * as z from "zod/v4";
// this is quite convoluted. we'll clean this up when we make
// it easier to extend / customize the default blocks
const paragraph = createBlockSpecFromStronglyTypedTiptapNode(
  createStronglyTypedTiptapNode<"paragraph", "inline*">(
    defaultBlockSpecs.paragraph.implementation.node.config as any,
  ),
  // disable default props on paragraph (such as textalignment and colors)
  z.object({}),
);

// remove textColor, backgroundColor from styleSpecs
const { textColor, backgroundColor, ...styleSpecs } = defaultStyleSpecs;

// the schema to use for comments
export const schema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph,
  },
  styleSpecs,
});
