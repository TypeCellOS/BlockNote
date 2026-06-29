import { createBlockConfig, createBlockSpec } from "../../schema/index.js";
import {
  parsePreCode,
  parsePreCodeContent,
} from "./helpers/parse/parsePreCode.js";
import { createPreCode } from "./helpers/toExternalHTML/createPreCode.js";
import { CodeKeyboardShortcutsExtension } from "./helpers/extensions/CodeKeyboardShortcutsExtension.js";
import { SourceBlockWithPreviewExtension } from "./helpers/extensions/SourceBlockWithPreviewExtension.js";
import { CodeBlockOptions } from "./CodeBlockOptions.js";
import { createSourceBlockWithPreview } from "./helpers/render/createSourceBlockWithPreview.js";
import { SyntaxHighlightingExtension } from "../../extensions/index.js";

const CODE_BLOCK_KEYBOARD_SHORTCUTS_KEY = "code-block-keyboard-shortcuts";
const CODE_BLOCK_PREVIEW_KEY = "code-block-preview";

export type CodeBlockConfig = ReturnType<typeof createCodeBlockConfig>;

export const createCodeBlockConfig = createBlockConfig(
  ({ defaultLanguage = "text" }: CodeBlockOptions) =>
    ({
      type: "codeBlock" as const,
      propSchema: {
        language: {
          default: defaultLanguage,
        },
      },
      content: "inline",
    }) as const,
);

export const createCodeBlockSpec = createBlockSpec(
  createCodeBlockConfig,
  (options) => ({
    meta: {
      code: true,
      defining: true,
      isolating: false,
      highlight: (block) => block.props.language,
    },
    parse: (el) => parsePreCode(el),
    parseContent: (opts) => parsePreCodeContent(opts, "codeBlock"),
    render: (block, editor) =>
      createSourceBlockWithPreview(
        block,
        editor,
        options.supportedLanguages && {
          selectedLanguage: block.props.language,
          supportedLanguages: options.supportedLanguages,
        },
      ),
    toExternalHTML: (block) => createPreCode(block),
  }),
  (options) => {
    return [
      CodeKeyboardShortcutsExtension(options)(
        CODE_BLOCK_KEYBOARD_SHORTCUTS_KEY,
        "codeBlock",
      ),
      SourceBlockWithPreviewExtension({
        key: CODE_BLOCK_PREVIEW_KEY,
        blockType: "codeBlock",
        hasPreview: (block) =>
          !!options.supportedLanguages?.[block.props.language]?.createPreview,
        runsBefore: [CODE_BLOCK_KEYBOARD_SHORTCUTS_KEY],
      }),
      options.createHighlighter &&
        SyntaxHighlightingExtension({
          createHighlighter: options.createHighlighter,
        }),
    ].filter((a) => !!a);
  },
);
