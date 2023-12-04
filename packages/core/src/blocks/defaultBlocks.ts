import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";
import Underline from "@tiptap/extension-underline";
import { BackgroundColor } from "../extensions/BackgroundColor/BackgroundColorMark";
import { TextColor } from "../extensions/TextColor/TextColorMark";
import {
  BlockSpecs,
  InlineContentSpecs,
  StyleSpecs,
  createStyleSpecFromTipTapMark,
  getBlockSchemaFromSpecs,
  getInlineContentSchemaFromSpecs,
  getStyleSchemaFromSpecs,
} from "../schema";
import { Heading } from "./HeadingBlockContent/HeadingBlockContent";
import { Image } from "./ImageBlockContent/ImageBlockContent";
import { BulletListItem } from "./ListItemBlockContent/BulletListItemBlockContent/BulletListItemBlockContent";
import { NumberedListItem } from "./ListItemBlockContent/NumberedListItemBlockContent/NumberedListItemBlockContent";
import { Paragraph } from "./ParagraphBlockContent/ParagraphBlockContent";
import { Table } from "./TableBlockContent/TableBlockContent";

export const defaultBlockSpecs = {
  paragraph: Paragraph,
  heading: Heading,
  bulletListItem: BulletListItem,
  numberedListItem: NumberedListItem,
  image: Image,
  table: Table,
} satisfies BlockSpecs;

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

export const defaultStyleSchema = getStyleSchemaFromSpecs(defaultStyleSpecs);

export type DefaultStyleSchema = typeof defaultStyleSchema;

export const defaultInlineContentSpecs = {
  text: { config: "text", implementation: {} as any },
  link: { config: "link", implementation: {} as any },
} satisfies InlineContentSpecs;

export const defaultInlineContentSchema = getInlineContentSchemaFromSpecs(
  defaultInlineContentSpecs
);

export type DefaultInlineContentSchema = typeof defaultInlineContentSchema;
