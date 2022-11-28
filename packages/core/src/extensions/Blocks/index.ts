import { Node } from "@tiptap/core";
import { Block } from "./nodes/Block";
import { BlockGroup } from "./nodes/BlockGroup";
import { TextContent } from "./nodes/TextContent";
import { HeadingContent } from "./nodes/HeadingContent";
import { ListItemContent } from "./nodes/ListItemContent";

export const blocks: any[] = [
  TextContent,
  HeadingContent,
  ListItemContent,
  Block,
  BlockGroup,
  Node.create({
    name: "doc",
    topNode: true,
    content: "blockGroup",
  }),
];
