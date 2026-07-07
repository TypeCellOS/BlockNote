import { createBlockConfig, createBlockSpec } from "../../schema/index.js";
import {
  parsePreCode,
  parsePreCodeContent,
} from "./helpers/parse/parsePreCode.js";
import { createPreCode } from "./helpers/toExternalHTML/createPreCode.js";
import { CodeKeyboardShortcutsExtension } from "./helpers/extensions/CodeKeyboardShortcutsExtension.js";
import { CodeBlockOptions } from "./CodeBlockOptions.js";
import { createCodeBlock } from "./helpers/render/createCodeBlock.js";

const CODE_BLOCK_KEYBOARD_SHORTCUTS_KEY = "code-block-keyboard-shortcuts";

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

export type CodeBlockConfig = ReturnType<typeof createCodeBlockConfig>;

export const createCodeBlockSpec = createBlockSpec(
  createCodeBlockConfig,
  (options) => ({
    meta: {
      code: true,
      defining: true,
      isolating: false,
    },
    parse: (el) => parsePreCode(el),
    parseContent: (opts) => parsePreCodeContent(opts, "codeBlock"),
    render: (block, editor) =>
      createCodeBlock(
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
    ];
  },
);
