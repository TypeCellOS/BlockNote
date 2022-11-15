import { Node } from "@tiptap/core";
import { Block } from "./nodes/Block";
import { BlockGroup } from "./nodes/BlockGroup";
import { ContentBlock } from "./nodes/Content";
import { ImageContentBlock } from "./nodes/ImageContent";

export const blocks: any[] = [
  // ContentBlock,
  ImageContentBlock,
  Block,
  BlockGroup,
  Node.create({
    name: "doc",
    topNode: true,
    content: "blockgroup",
  }),
];
