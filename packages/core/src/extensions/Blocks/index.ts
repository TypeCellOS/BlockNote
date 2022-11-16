import { Node } from "@tiptap/core";
import { Block } from "./nodes/Block";
import { BlockGroup } from "./nodes/BlockGroup";
import { TextBlock } from "./nodes/TextBlock";
import { HeadingBlock } from "./nodes/HeadingBlock";

export const blocks: any[] = [
  TextBlock,
  HeadingBlock,
  Block,
  BlockGroup,
  Node.create({
    name: "doc",
    topNode: true,
    content: "blockgroup",
  }),
];
