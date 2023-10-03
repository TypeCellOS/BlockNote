import { Heading } from "../nodes/BlockContent/HeadingBlockContent/HeadingBlockContent";
import { BulletListItem } from "../nodes/BlockContent/ListItemBlockContent/BulletListItemBlockContent/BulletListItemBlockContent";
import { NumberedListItem } from "../nodes/BlockContent/ListItemBlockContent/NumberedListItemBlockContent/NumberedListItemBlockContent";
import { Paragraph } from "../nodes/BlockContent/ParagraphBlockContent/ParagraphBlockContent";
import { Image } from "../nodes/BlockContent/ImageBlockContent/ImageBlockContent";
import { BlockSchema } from "./blockTypes";

export const defaultBlockSchema = {
  paragraph: Paragraph,
  heading: Heading,
  bulletListItem: BulletListItem,
  numberedListItem: NumberedListItem,
  image: Image,
} as const satisfies BlockSchema;

export type DefaultBlockSchema = typeof defaultBlockSchema;
