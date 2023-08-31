import { HeadingBlockContent } from "../nodes/BlockContent/HeadingBlockContent/HeadingBlockContent";
import { BulletListItemBlockContent } from "../nodes/BlockContent/ListItemBlockContent/BulletListItemBlockContent/BulletListItemBlockContent";
import { NumberedListItemBlockContent } from "../nodes/BlockContent/ListItemBlockContent/NumberedListItemBlockContent/NumberedListItemBlockContent";
import { ParagraphBlockContent } from "../nodes/BlockContent/ParagraphBlockContent/ParagraphBlockContent";
import { BlockSchema, TypesMatch } from "./blockTypes";
import { Image } from "../nodes/BlockContent/ImageBlockContent/ImageBlockContent";
import { defaultProps } from "./defaultProps";

export const defaultBlockSchema = {
  paragraph: {
    node: ParagraphBlockContent,
    propSchema: defaultProps,
    containsInlineContent: true,
  },
  heading: {
    node: HeadingBlockContent,
    propSchema: {
      ...defaultProps,
      level: { default: "1", values: ["1", "2", "3"] as const },
    },
    containsInlineContent: true,
  },
  bulletListItem: {
    node: BulletListItemBlockContent,
    propSchema: defaultProps,
    containsInlineContent: true,
  },
  numberedListItem: {
    node: NumberedListItemBlockContent,
    propSchema: defaultProps,
    containsInlineContent: true,
  },
  image: Image,
} as const satisfies BlockSchema;

export type DefaultBlockSchema = TypesMatch<typeof defaultBlockSchema>;
