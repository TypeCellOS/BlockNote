import { Node } from "@tiptap/core";
import { BlockContainer } from "./nodes/BlockContainer";
import { BlockGroup } from "./nodes/BlockGroup";
import { ParagraphBlockContent } from "./nodes/BlockContent/ParagraphBlockContent/ParagraphBlockContent";
import { HeadingBlockContent } from "./nodes/BlockContent/HeadingBlockContent/HeadingBlockContent";
import { BulletListItemBlockContent } from "./nodes/BlockContent/ListItemBlockContent/BulletListItemBlockContent/BulletListItemBlockContent";
import { NumberedListItemBlockContent } from "./nodes/BlockContent/ListItemBlockContent/NumberedListItemBlockContent/NumberedListItemBlockContent";
import { TableContent } from "./nodes/BlockContent/TableContent/TableContent";
import { TableRow } from "./nodes/BlockContent/TableContent/TableRow";
import { TableCol } from "./nodes/BlockContent/TableContent/TableCol";

export const blocks: any[] = [
  ParagraphBlockContent,
  HeadingBlockContent,
  BulletListItemBlockContent,
  NumberedListItemBlockContent,
  TableContent,
  TableRow,
  TableCol,
  BlockContainer,
  BlockGroup,
  Node.create({
    name: "doc",
    topNode: true,
    content: "blockGroup",
  }),
];
