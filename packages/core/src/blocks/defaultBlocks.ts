import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";
import Underline from "@tiptap/extension-underline";
import { createExtension } from "../editor/BlockNoteExtension.js";
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
import { marksExcludingNonFormattingMarks } from "../schema/markGroups.js";
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
  [
    K in keyof typeof defaultBlockSpecs
  ]: (typeof defaultBlockSpecs)[K]["config"];
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
  bold: createStyleSpecFromTipTapMark(
    Bold.extend({ addInputRules: () => [] }),
    "boolean",
    [
      createExtension({
        key: "bold-input-rules",
        inputRules: [
          {
            find: /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))$/,
            replace: ({ match }) => ({
              text: match[2],
              styles: { bold: true },
            }),
          },
          {
            find: /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/,
            replace: ({ match }) => ({
              text: match[2],
              styles: { bold: true },
            }),
          },
        ],
      }),
    ],
  ),
  italic: createStyleSpecFromTipTapMark(
    Italic.extend({ addInputRules: () => [] }),
    "boolean",
    [
      createExtension({
        key: "italic-input-rules",
        inputRules: [
          {
            find: /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))$/,
            replace: ({ match }) => ({
              text: match[2],
              styles: { italic: true },
            }),
          },
          {
            find: /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))$/,
            replace: ({ match }) => ({
              text: match[2],
              styles: { italic: true },
            }),
          },
        ],
      }),
    ],
  ),
  underline: createStyleSpecFromTipTapMark(Underline, "boolean"),
  strike: createStyleSpecFromTipTapMark(
    Strike.extend({ addInputRules: () => [] }),
    "boolean",
    [
      createExtension({
        key: "strike-input-rules",
        inputRules: [
          {
            find: /(?:^|\s)(~~(?!\s+~~)((?:[^~]+))~~(?!\s+~~))$/,
            replace: ({ match }) => ({
              text: match[2],
              styles: { strike: true },
            }),
          },
        ],
      }),
    ],
  ),
  code: createStyleSpecFromTipTapMark(
    Code.extend({
      // Built-in shortcuts use BlockNote's shared input-rule engine instead.
      addInputRules: () => [],
      excludes() {
        return marksExcludingNonFormattingMarks(this.editor);
      },
    }),
    "boolean",
    [
      createExtension({
        key: "code-input-rules",
        inputRules: [
          // Look behind the opening delimiter to preserve the preceding character.
          {
            find: /(?<!`)`([^`]+)`(?!`)$/,
            replace: ({ match }) => ({
              text: match[1],
              styles: { code: true },
            }),
          },
          // Also convert pre-existing delimiters when a space follows them.
          {
            find: /(?<!`)`([^`]+)`(?!`) $/,
            replace: ({ match }) => ({
              text: match[1],
              styles: { code: true },
            }),
          },
        ],
      }),
    ],
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
