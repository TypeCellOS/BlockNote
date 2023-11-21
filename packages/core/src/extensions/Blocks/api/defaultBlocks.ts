import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";
import Underline from "@tiptap/extension-underline";
import { BackgroundColor } from "../../BackgroundColor/BackgroundColorMark";
import { TextColor } from "../../TextColor/TextColorMark";
import { Heading } from "../nodes/BlockContent/HeadingBlockContent/HeadingBlockContent";
import { Image } from "../nodes/BlockContent/ImageBlockContent/ImageBlockContent";
import { BulletListItem } from "../nodes/BlockContent/ListItemBlockContent/BulletListItemBlockContent/BulletListItemBlockContent";
import { NumberedListItem } from "../nodes/BlockContent/ListItemBlockContent/NumberedListItemBlockContent/NumberedListItemBlockContent";
import { Paragraph } from "../nodes/BlockContent/ParagraphBlockContent/ParagraphBlockContent";
import { Table } from "../nodes/BlockContent/TableBlockContent/TableBlockContent";
import { BlockSchemaFromSpecs, BlockSpecs } from "./blocks/types";
import {
  InlineContentSchemaFromSpecs,
  InlineContentSpecs,
} from "./inlineContent/types";
import { createStyleSpecFromTipTapMark } from "./styles/internal";
import { StyleSchemaFromSpecs, StyleSpecs } from "./styles/types";

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
  bold: createStyleSpecFromTipTapMark(Bold, "boolean"),
  italic: createStyleSpecFromTipTapMark(Italic, "boolean"),
  underline: createStyleSpecFromTipTapMark(Underline, "boolean"),
  strike: createStyleSpecFromTipTapMark(Strike, "boolean"),
  code: createStyleSpecFromTipTapMark(Code, "boolean"),
  textColor: TextColor,
  backgroundColor: BackgroundColor,
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
