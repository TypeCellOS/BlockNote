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
import { getBlockSchemaFromSpecs } from "./blocks/internal";
import { BlockSpecs } from "./blocks/types";
import { getInlineContentSchemaFromSpecs } from "./inlineContent/internal";
import { InlineContentSpecs } from "./inlineContent/types";
import {
  createStyleSpecFromTipTapMark,
  getStyleSchemaFromSpecs,
} from "./styles/internal";
import { StyleSpecs } from "./styles/types";

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

export const defaultInlineContentSpecs = {} satisfies InlineContentSpecs;

export const defaultInlineContentSchema = getInlineContentSchemaFromSpecs(
  defaultInlineContentSpecs
);

export type DefaultInlineContentSchema = typeof defaultInlineContentSchema;
