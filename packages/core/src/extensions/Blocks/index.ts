import { Node } from "@tiptap/core";
import { Block } from "./nodes/Block";
import { BlockGroup } from "./nodes/BlockGroup";
import { ParagraphBlockContent } from "./nodes/BlockContent/ParagraphBlockContent/ParagraphBlockContent";
import { HeadingBlockContent } from "./nodes/BlockContent/HeadingBlockContent/HeadingBlockContent";
import { BulletListItemBlockContent } from "./nodes/BlockContent/ListItemBlockContent/BulletListItemBlockContent/BulletListItemBlockContent";
import { NumberedListItemBlockContent } from "./nodes/BlockContent/ListItemBlockContent/NumberedListItemBlockContent/NumberedListItemBlockContent";

export const blocks: any[] = [
  ParagraphBlockContent,
  HeadingBlockContent,
  BulletListItemBlockContent,
  NumberedListItemBlockContent,
  Block,
  BlockGroup,
  Node.create({
    name: "doc",
    topNode: true,
    content: "blockGroup",
  }),
];
