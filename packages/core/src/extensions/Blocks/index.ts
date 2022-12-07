import { Node } from "@tiptap/core";
import { Block } from "./nodes/Block";
import { BlockGroup } from "./nodes/BlockGroup";
import { TextContent } from "./nodes/BlockTypes/TextBlock/TextContent";
import { HeadingContent } from "./nodes/BlockTypes/HeadingBlock/HeadingContent";
import { ListItemContent } from "./nodes/BlockTypes/ListItemBlock/ListItemContent";

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
