import { Node } from "@tiptap/core";
import { Block } from "./nodes/Block";
import { BlockGroup } from "./nodes/BlockGroup";
import { Paragraph } from "./nodes/BlockTypes/Paragraph/Paragraph";
import { Heading } from "./nodes/BlockTypes/Heading/Heading";
import { ListItem } from "./nodes/BlockTypes/ListItem/ListItem";

export const blocks: any[] = [
  Paragraph,
  Heading,
  ListItem,
  Block,
  BlockGroup,
  Node.create({
    name: "doc",
    topNode: true,
    content: "blockGroup",
  }),
];
