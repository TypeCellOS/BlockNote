import { Heading } from "../nodes/BlockContent/HeadingBlockContent/HeadingBlockContent";
import { Image } from "../nodes/BlockContent/ImageBlockContent/ImageBlockContent";
import { BulletListItem } from "../nodes/BlockContent/ListItemBlockContent/BulletListItemBlockContent/BulletListItemBlockContent";
import { NumberedListItem } from "../nodes/BlockContent/ListItemBlockContent/NumberedListItemBlockContent/NumberedListItemBlockContent";
import { Paragraph } from "../nodes/BlockContent/ParagraphBlockContent/ParagraphBlockContent";
// import { Table } from "../nodes/BlockContent/TableBlockContent/TableBlockContent";
import { BlockSchema } from "./blockTypes";

export const defaultBlockSchema = {
  paragraph: Paragraph,
  heading: Heading,
  bulletListItem: BulletListItem,
  numberedListItem: NumberedListItem,
  image: Image,
  // table: Table,
} satisfies BlockSchema;

export type DefaultBlockSchema = typeof defaultBlockSchema;
