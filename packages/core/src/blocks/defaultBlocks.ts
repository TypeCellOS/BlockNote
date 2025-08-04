import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";
import Underline from "@tiptap/extension-underline";
import {
  audio,
  bulletListItem,
  checkListItem,
  codeBlock,
  file,
  heading,
  image,
  numberedListItem,
  pageBreak,
  paragraph,
  quoteBlock,
  toggleListItem,
  video,
} from "../blks/index.js";
import { BackgroundColor } from "../extensions/BackgroundColor/BackgroundColorMark.js";
import { TextColor } from "../extensions/TextColor/TextColorMark.js";
import {
  BlockDefinition,
  BlockNoDefaults,
  BlockSchema,
  ExtractBlockConfig,
  InlineContentSchema,
  InlineContentSpecs,
  PartialBlockNoDefaults,
  StyleSchema,
  StyleSpecs,
  createStyleSpecFromTipTapMark,
  getInlineContentSchemaFromSpecs,
  getStyleSchemaFromSpecs,
} from "../schema/index.js";
import { Table } from "./TableBlockContent/TableBlockContent.js";

export const defaultBlockSpecs = {
  paragraph: paragraph.definition(),
  audio: audio.definition(),
  bulletListItem: bulletListItem.definition(),
  checkListItem: checkListItem.definition(),
  codeBlock: codeBlock.definition(),
  heading: heading.definition(),
  numberedListItem: numberedListItem.definition(),
  pageBreak: pageBreak.definition(),
  quoteBlock: quoteBlock.definition(),
  toggleListItem: toggleListItem.definition(),
  file: file.definition(),
  image: image.definition(),
  video: video.definition(),
  table: Table as unknown as BlockDefinition,
} as const;

// underscore is used that in case a user overrides DefaultBlockSchema,
// they can still access the original default block schema
export type _DefaultBlockSchema = {
  [K in keyof typeof defaultBlockSpecs]: ExtractBlockConfig<
    (typeof defaultBlockSpecs)[K]
  >;
};
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
