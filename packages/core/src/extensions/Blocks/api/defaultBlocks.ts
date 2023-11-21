import { Heading } from "../nodes/BlockContent/HeadingBlockContent/HeadingBlockContent";
import { Image } from "../nodes/BlockContent/ImageBlockContent/ImageBlockContent";
import { BulletListItem } from "../nodes/BlockContent/ListItemBlockContent/BulletListItemBlockContent/BulletListItemBlockContent";
import { NumberedListItem } from "../nodes/BlockContent/ListItemBlockContent/NumberedListItemBlockContent/NumberedListItemBlockContent";
import { Paragraph } from "../nodes/BlockContent/ParagraphBlockContent/ParagraphBlockContent";
import { Table } from "../nodes/BlockContent/TableBlockContent/TableBlockContent";
import { BlockSchemaFromSpecs, BlockSpecs } from "./blockTypes";
import {
  InlineContentSchemaFromSpecs,
  InlineContentSpecs,
} from "./inlineContentTypes";
import { StyleSchemaFromSpecs, StyleSpecs } from "./styles";

export const defaultBlockSpecs = {
  paragraph: Paragraph,
  heading: Heading,
  bulletListItem: BulletListItem,
  numberedListItem: NumberedListItem,
  image: Image,
  table: Table,
} satisfies BlockSpecs;

export function getBlockSchemaFromSpecs<T extends BlockSpecs>(specs: T) {
  return Object.fromEntries(
    Object.entries(specs).map(([key, value]) => [key, value.config])
  ) as BlockSchemaFromSpecs<T>;
}

export const defaultBlockSchema = getBlockSchemaFromSpecs(defaultBlockSpecs);

export type DefaultBlockSchema = typeof defaultBlockSchema;

export const defaultStyleSpecs = {
  bold: {
    config: {
      type: "bold",
      propSchema: "boolean",
    },
    implementation: {},
  },
  italic: {
    config: {
      type: "italic",
      propSchema: "boolean",
    },
    implementation: {},
  },
  underline: {
    config: {
      type: "underline",
      propSchema: "boolean",
    },
    implementation: {},
  },
  strike: {
    config: {
      type: "strike",
      propSchema: "boolean",
    },
    implementation: {},
  },
  code: {
    config: {
      type: "code",
      propSchema: "boolean",
    },
    implementation: {},
  },
  textColor: {
    config: {
      type: "textColor",
      propSchema: "string",
    },
    implementation: {},
  },
  backgroundColor: {
    config: {
      type: "backgroundColor",
      propSchema: "string",
    },
    implementation: {},
  },
} satisfies StyleSpecs;

export function getStyleSchemaFromSpecs<T extends StyleSpecs>(specs: T) {
  return Object.fromEntries(
    Object.entries(specs).map(([key, value]) => [key, value.config])
  ) as StyleSchemaFromSpecs<T>;
}

export const defaultStyleSchema = getStyleSchemaFromSpecs(defaultStyleSpecs);

export type DefaultStyleSchema = typeof defaultStyleSchema;

export const defaultInlineContentSpecs = {} satisfies InlineContentSpecs;

export function getInlineContentSchemaFromSpecs<T extends InlineContentSpecs>(
  specs: T
) {
  return Object.fromEntries(
    Object.entries(specs).map(([key, value]) => [key, value.config])
  ) as InlineContentSchemaFromSpecs<T>;
}

export const defaultInlineContentSchema = getInlineContentSchemaFromSpecs(
  defaultInlineContentSpecs
);

export type DefaultInlineContentSchema = typeof defaultInlineContentSchema;
