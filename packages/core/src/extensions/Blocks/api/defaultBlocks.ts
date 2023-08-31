import { HeadingBlockContent } from "../nodes/BlockContent/HeadingBlockContent/HeadingBlockContent";
import { BulletListItemBlockContent } from "../nodes/BlockContent/ListItemBlockContent/BulletListItemBlockContent/BulletListItemBlockContent";
import { NumberedListItemBlockContent } from "../nodes/BlockContent/ListItemBlockContent/NumberedListItemBlockContent/NumberedListItemBlockContent";
import { ParagraphBlockContent } from "../nodes/BlockContent/ParagraphBlockContent/ParagraphBlockContent";
import { BlockSchema, PropSchema, TypesMatch } from "./blockTypes";
import { Image } from "../nodes/BlockContent/ImageBlockContent/ImageBlockContent";

export const defaultProps = {
  backgroundColor: {
    default: "transparent" as const,
  },
  textColor: {
    default: "black" as const, // TODO
  },
  textAlignment: {
    default: "left" as const,
    values: ["left", "center", "right", "justify"] as const,
  },
} satisfies PropSchema;

export type DefaultProps = typeof defaultProps;

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
