import { z } from "zod";

import { HeadingBlockContent } from "../nodes/BlockContent/HeadingBlockContent/HeadingBlockContent";
import { BulletListItemBlockContent } from "../nodes/BlockContent/ListItemBlockContent/BulletListItemBlockContent/BulletListItemBlockContent";
import { NumberedListItemBlockContent } from "../nodes/BlockContent/ListItemBlockContent/NumberedListItemBlockContent/NumberedListItemBlockContent";
import { ParagraphBlockContent } from "../nodes/BlockContent/ParagraphBlockContent/ParagraphBlockContent";

export const defaultPropSchema = z.object({
  backgroundColor: z.enum(["transparent", "red", "orange", "yellow", "blue"]).optional(),
  textColor: z.enum(["black", "red", "orange", "yellow"]).optional(),
  textAlignment: z.enum(["left", "center", "right", "justify"]).optional(),
});

export const defaultProps = {
  backgroundColor: "transparent",
  textColor: "black",
  textAlignment: "left",
} satisfies z.infer<typeof defaultPropSchema>;

export type DefaultProps = typeof defaultProps;

export const defaultBlockSchema = {
  paragraph: {
    propSchema: defaultPropSchema,
    props: defaultProps,
    node: ParagraphBlockContent,
  },
  heading: {
    propSchema: defaultPropSchema.merge(z.object({
      level: z.enum(["1", "2", "3"]).optional(),
    })),
    props: {
      ...defaultProps,
      level: "1",
    },
    node: HeadingBlockContent,
  },
  bulletListItem: {
    propSchema: defaultPropSchema,
    props: defaultProps,
    node: BulletListItemBlockContent,
  },
  numberedListItem: {
    propSchema: defaultPropSchema,
    props: defaultProps,
    node: NumberedListItemBlockContent,
  },
} as const;

export type DefaultBlockSchema = typeof defaultBlockSchema;