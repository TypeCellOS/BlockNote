import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";
import Underline from "@tiptap/extension-underline";
import {
  createAudioBlockSpec,
  createBulletListItemBlockSpec,
  createCheckListItemBlockSpec,
  createCodeBlockSpec,
  createFileBlockSpec,
  createHeadingBlockSpec,
  createImageBlockSpec,
  createNumberedListItemBlockSpec,
  createParagraphBlockSpec,
  createQuoteBlockSpec,
  createToggleListItemBlockSpec,
  createVideoBlockSpec,
} from "./index.js";
import { BackgroundColor } from "../extensions/BackgroundColor/BackgroundColorMark.js";
import { TextColor } from "../extensions/TextColor/TextColorMark.js";
import {
  BlockConfig,
  BlockNoDefaults,
  BlockSchema,
  InlineContentSchema,
  InlineContentSpecs,
  PartialBlockNoDefaults,
  StyleSchema,
  StyleSpecs,
  createStyleSpecFromTipTapMark,
  getInlineContentSchemaFromSpecs,
  getStyleSchemaFromSpecs,
} from "../schema/index.js";
import { createTableBlockSpec } from "./Table/block.js";

export const defaultBlockSpecs = {
  audio: createAudioBlockSpec(),
  bulletListItem: createBulletListItemBlockSpec(),
  checkListItem: createCheckListItemBlockSpec(),
  codeBlock: createCodeBlockSpec(),
  file: createFileBlockSpec(),
  heading: createHeadingBlockSpec(),
  image: createImageBlockSpec(),
  numberedListItem: createNumberedListItemBlockSpec(),
  paragraph: createParagraphBlockSpec(),
  quote: createQuoteBlockSpec(),
  table: createTableBlockSpec(),
  toggleListItem: createToggleListItemBlockSpec(),
  video: createVideoBlockSpec(),
} as const;

// underscore is used that in case a user overrides DefaultBlockSchema,
// they can still access the original default block schema
export type _DefaultBlockSchema = Omit<
  {
    [K in keyof typeof defaultBlockSpecs]: (typeof defaultBlockSpecs)[K]["config"];
  },
  "table"
> & {
  table: BlockConfig<
    "table",
    {
      textColor: {
        default: "default";
      };
    },
    "table"
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
