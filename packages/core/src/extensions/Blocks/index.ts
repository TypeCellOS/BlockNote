import { Node } from "@tiptap/core";
import { Block } from "./nodes/Block";
import { BlockGroup } from "./nodes/BlockGroup";
import { TextBlock } from "./nodes/TextBlock";
import { HeadingBlock } from "./nodes/HeadingBlock";
import { ListItemBlock } from "./nodes/ListItemBlock";

export const blocks: any[] = [
  TextBlock,
  HeadingBlock,
  ListItemBlock,
  Block,
  BlockGroup,
  Node.create({
    name: "doc",
    topNode: true,
    content: "blockgroup",
  }),
];
