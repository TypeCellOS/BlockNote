import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";
import Underline from "@tiptap/extension-underline";
import { BackgroundColor } from "../extensions/BackgroundColor/BackgroundColorMark.js";
import { TextColor } from "../extensions/TextColor/TextColorMark.js";
import {
  BlockNoDefaults,
  BlockSchema,
  BlockSpecs,
  InlineContentSchema,
  InlineContentSpecs,
  PartialBlockNoDefaults,
  StyleSchema,
  StyleSpecs,
  createStyleSpecFromTipTapMark,
  getBlockSchemaFromSpecs,
  getInlineContentSchemaFromSpecs,
  getStyleSchemaFromSpecs,
} from "../schema/index.js";

import { AudioBlock } from "./AudioBlockContent/AudioBlockContent.js";
import { CodeBlock } from "./CodeBlockContent/CodeBlockContent.js";
import { FileBlock } from "./FileBlockContent/FileBlockContent.js";
import { Heading } from "./HeadingBlockContent/HeadingBlockContent.js";
import { ImageBlock } from "./ImageBlockContent/ImageBlockContent.js";
import { ToggleListItem } from "./ListItemBlockContent/ToggleListItemBlockContent/ToggleListItemBlockContent.js";
import { BulletListItem } from "./ListItemBlockContent/BulletListItemBlockContent/BulletListItemBlockContent.js";
import { CheckListItem } from "./ListItemBlockContent/CheckListItemBlockContent/CheckListItemBlockContent.js";
import { NumberedListItem } from "./ListItemBlockContent/NumberedListItemBlockContent/NumberedListItemBlockContent.js";
import { Paragraph } from "./ParagraphBlockContent/ParagraphBlockContent.js";
import { Quote } from "./QuoteBlockContent/QuoteBlockContent.js";
import { Table } from "./TableBlockContent/TableBlockContent.js";
import { VideoBlock } from "./VideoBlockContent/VideoBlockContent.js";

export const defaultBlockSpecs = {
  paragraph: Paragraph,
  heading: Heading,
  quote: Quote,
  codeBlock: CodeBlock,
  toggleListItem: ToggleListItem,
  bulletListItem: BulletListItem,
  numberedListItem: NumberedListItem,
  checkListItem: CheckListItem,
  table: Table,
  file: FileBlock,
  image: ImageBlock,
  video: VideoBlock,
  audio: AudioBlock,
} satisfies BlockSpecs;

export const defaultBlockSchema = getBlockSchemaFromSpecs(defaultBlockSpecs);

// underscore is used that in case a user overrides DefaultBlockSchema,
// they can still access the original default block schema
export type _DefaultBlockSchema = typeof defaultBlockSchema;
export type DefaultBlockSchema = _DefaultBlockSchema;

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

// underscore is used that in case a user overrides DefaultStyleSchema,
// they can still access the original default style schema
export type _DefaultStyleSchema = typeof defaultStyleSchema;
export type DefaultStyleSchema = _DefaultStyleSchema;

export const defaultInlineContentSpecs = {
  text: { config: "text", implementation: {} as any },
  link: { config: "link", implementation: {} as any },
} satisfies InlineContentSpecs;

export const defaultInlineContentSchema = getInlineContentSchemaFromSpecs(
  defaultInlineContentSpecs,
);

// underscore is used that in case a user overrides DefaultInlineContentSchema,
// they can still access the original default inline content schema
export type _DefaultInlineContentSchema = typeof defaultInlineContentSchema;
export type DefaultInlineContentSchema = _DefaultInlineContentSchema;

export type PartialBlock<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
> = PartialBlockNoDefaults<BSchema, I, S>;

export type Block<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
> = BlockNoDefaults<BSchema, I, S>;
