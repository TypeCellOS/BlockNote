import { InputRule, markInputRule } from "@tiptap/core";
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
import {
  createAudioBlockSpec,
  createBulletListItemBlockSpec,
  createCheckListItemBlockSpec,
  createCodeBlockSpec,
  createDividerBlockSpec,
  createFileBlockSpec,
  createHeadingBlockSpec,
  createImageBlockSpec,
  createNumberedListItemBlockSpec,
  createParagraphBlockSpec,
  createQuoteBlockSpec,
  createToggleListItemBlockSpec,
  createVideoBlockSpec,
  defaultProps,
} from "./index.js";
import { createTableBlockSpec } from "./Table/block.js";

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
      if (value !== defaultProps.textColor.default) {
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
      if (value !== defaultProps.backgroundColor.default) {
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
  code: createStyleSpecFromTipTapMark(
    Code.extend({
      addInputRules() {
        return [
          // Matches any string that starts with a backtick, ends with a
          // backtick, and has any non-backtick characters in between. Copied
          // from original input rule:
          // https://github.com/ueberdosis/tiptap/blob/c27661c148cdbea9e1c80107e10d0a9d1775c4ec/packages/extension-code/src/code.ts#L116
          markInputRule({
            find: /(^|[^`])`([^`]+)`(?!`)$/,
            type: this.type,
          }),
          // Extends the Code mark with an extra input rule that fires when a space is
          // typed after the closing backtick. The default rule only fires when typing
          // the closing backtick itself, so it misses the case where the user adds
          // both backticks first, then writes content between them.
          new InputRule({
            find: /(^|[^`])`([^`]+)`(?!`) $/,
            handler: ({ state, range, match }) => {
              const { tr, schema } = state;
              const leadingChar = match[1];
              const content = match[2];
              tr.replaceWith(range.from + leadingChar.length, range.to, [
                schema.text(content, [this.type.create()]),
                schema.text(" "),
              ]);
            },
          }),
        ];
      },
    }),
    "boolean",
  ),
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
