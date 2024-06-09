import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";
import Underline from "@tiptap/extension-underline";
import { BackgroundColor } from "../extensions/BackgroundColor/BackgroundColorMark";
import { TextColor } from "../extensions/TextColor/TextColorMark";
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
} from "../schema";

import { Heading } from "./HeadingBlockContent/HeadingBlockContent";
import { BulletListItem } from "./ListItemBlockContent/BulletListItemBlockContent/BulletListItemBlockContent";
import { NumberedListItem } from "./ListItemBlockContent/NumberedListItemBlockContent/NumberedListItemBlockContent";
import { CheckListItem } from "./ListItemBlockContent/CheckListItemBlockContent/CheckListItemBlockContent";
import { Paragraph } from "./ParagraphBlockContent/ParagraphBlockContent";
import { Table } from "./TableBlockContent/TableBlockContent";
import { FileBlock } from "./FileBlockContent/FileBlockContent";
import { ImageBlock } from "./ImageBlockContent/ImageBlockContent";
import { VideoBlock } from "./VideoBlockContent/VideoBlockContent";
import { AudioBlock } from "./AudioBlockContent/AudioBlockContent";

export const defaultBlockSpecs = {
  paragraph: Paragraph,
  heading: Heading,
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
  defaultInlineContentSpecs
);

// underscore is used that in case a user overrides DefaultInlineContentSchema,
// they can still access the original default inline content schema
export type _DefaultInlineContentSchema = typeof defaultInlineContentSchema;
export type DefaultInlineContentSchema = _DefaultInlineContentSchema;

export type PartialBlock<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
> = PartialBlockNoDefaults<BSchema, I, S>;

export type Block<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
> = BlockNoDefaults<BSchema, I, S>;
