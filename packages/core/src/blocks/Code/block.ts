import { createBlockConfig, createBlockSpec } from "../../schema/index.js";
import {
  parsePreCode,
  parsePreCodeContent,
} from "./helpers/parse/parsePreCode.js";
import { createPreCode } from "./helpers/toExternalHTML/createPreCode.js";
import { createCodeKeyboardShortcutsExtension } from "./helpers/extensions/createCodeKeyboardShortcutsExtension.js";
import { CodeBlockOptions } from "./CodeBlockOptions.js";
import { createSourceBlockWithPreview } from "./helpers/render/createSourceBlockWithPreview.js";

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
          createPreview:
            options.supportedLanguages[block.props.language].createPreview,
        },
      ),
    toExternalHTML: (block) => createPreCode(block),
  }),
  (options) => {
    return [
      createCodeKeyboardShortcutsExtension(options)(
        "code-block-keyboard-shortcuts",
        "codeBlock",
      ),
    ];
  },
);
