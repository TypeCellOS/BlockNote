import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";
import Underline from "@tiptap/extension-underline";
import { COLORS_DEFAULT } from "../editor/defaultColors.js";
import {
  BlockNoDefaults,
  BlockSchema,
  InlineContentSchema,
  InlineContentSpecs,
  PartialBlockNoDefaults,
  StyleSchema,
  StyleSpecs,
  createStyleSpec,
  createStyleSpecFromTipTapMark,
  getInlineContentSchemaFromSpecs,
  getStyleSchemaFromSpecs,
} from "../schema/index.js";
import { createAudioBlockSpec } from "./Audio/block.js";
import { createCodeBlockSpec } from "./Code/block.js";
import { defaultProps } from "./defaultProps.js";
import { createDividerBlockSpec } from "./Divider/block.js";
import { createFileBlockSpec } from "./File/block.js";
import { createHeadingBlockSpec } from "./Heading/block.js";
import { createImageBlockSpec } from "./Image/block.js";
import { createBulletListItemBlockSpec } from "./ListItem/BulletListItem/block.js";
import { createCheckListItemBlockSpec } from "./ListItem/CheckListItem/block.js";
import { createNumberedListItemBlockSpec } from "./ListItem/NumberedListItem/block.js";
import { createToggleListItemBlockSpec } from "./ListItem/ToggleListItem/block.js";
import { createParagraphBlockSpec } from "./Paragraph/block.js";
import { createQuoteBlockSpec } from "./Quote/block.js";
import { createTableBlockSpec } from "./Table/block.js";
import { createVideoBlockSpec } from "./Video/block.js";

export const defaultBlockSpecs = {
  audio: createAudioBlockSpec(),
  bulletListItem: createBulletListItemBlockSpec(),
  checkListItem: createCheckListItemBlockSpec(),
  codeBlock: createCodeBlockSpec(),
  divider: createDividerBlockSpec(),
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
export type _DefaultBlockSchema = {
  [K in keyof typeof defaultBlockSpecs]: (typeof defaultBlockSpecs)[K]["config"];
};
export type DefaultBlockSchema = _DefaultBlockSchema;

const TextColor = createStyleSpec(
  {
    type: "textColor",
    propSchema: "string",
  },
  {
    render: () => {
      const span = document.createElement("span");

      return {
        dom: span,
        contentDOM: span,
      };
    },
    toExternalHTML: (value) => {
      const span = document.createElement("span");
      // const defaultValue = defaultProps.parse({}).textColor;
      const defaultValue = defaultProps.shape.textColor.def.defaultValue;
      if (value !== defaultValue) {
        span.style.color =
          value in COLORS_DEFAULT ? COLORS_DEFAULT[value].text : value;
      }

      return {
        dom: span,
        contentDOM: span,
      };
    },
    parse: (element) => {
      if (element.tagName === "SPAN" && element.style.color) {
        return element.style.color;
      }

      return undefined;
    },
  },
);

const BackgroundColor = createStyleSpec(
  {
    type: "backgroundColor",
    propSchema: "string",
  },
  {
    render: () => {
      const span = document.createElement("span");

      return {
        dom: span,
        contentDOM: span,
      };
    },
    toExternalHTML: (value) => {
      const span = document.createElement("span");
      // TODO
      // const defaultValues = defaultProps.parse({});
      const defaultValue = defaultProps.shape.backgroundColor.def.defaultValue;
      if (value !== defaultValue) {
        span.style.backgroundColor =
          value in COLORS_DEFAULT ? COLORS_DEFAULT[value].background : value;
      }

      return {
        dom: span,
        contentDOM: span,
      };
    },
    parse: (element) => {
      if (element.tagName === "SPAN" && element.style.backgroundColor) {
        return element.style.backgroundColor;
      }

      return undefined;
    },
  },
);

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
