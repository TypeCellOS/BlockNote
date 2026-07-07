import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { BlockFromConfig } from "../../schema/index.js";

/**
 * Renders a preview of a code block's content (e.g. rendered LaTeX). Takes the
 * same parameters as a block's `render` function and returns the same type,
 * minus `contentDOM` - as a preview never holds the block's editable content.
 *
 * A `renderPreview` function is only responsible for the preview itself. It has
 * no opinion on when, where, or how the preview is displayed - that's up to the
 * code block's `render` function.
 */
export type CodeBlockPreview = (
  block: BlockFromConfig<any, any, any>,
  editor: BlockNoteEditor<any>,
) => {
  dom: HTMLElement | DocumentFragment;
  error?: string | null;
};

export type CodeBlockOptions = {
  /**
   * Whether to indent lines with a tab when the user presses `Tab` in a code block.
   *
   * @default true
   */
  indentLineWithTab?: boolean;
  /**
   * The default language to use for code blocks.
   *
   * @default "text"
   */
  defaultLanguage?: string;
  /**
   * The languages that are supported in the editor.
   *
   * @example
   * {
   *   javascript: {
   *     name: "JavaScript",
   *     aliases: ["js"],
   *   },
   *   typescript: {
   *     name: "TypeScript",
   *     aliases: ["ts"],
   *   },
   * }
   */
  supportedLanguages?: Record<
    string,
    {
      /**
       * The display name of the language.
       */
      name: string;
      /**
       * Aliases for this language.
       */
      aliases?: string[];
      /**
       * Renders a preview of the result of the code (e.g. rendered LaTeX). When
       * defined, the code block displays this preview instead of the raw source
       * by default, and shows the editable source in a popup when selected.
       */
      createPreview?: CodeBlockPreview;
    }
  >;
};

export function getLanguageId(
  options: CodeBlockOptions,
  languageName: string,
): string | undefined {
  const normalizedLanguage = languageName.trim().toLowerCase();
  return Object.entries(options.supportedLanguages ?? {}).find(
    ([id, { aliases }]) => {
      return (
        id.toLowerCase() === normalizedLanguage ||
        aliases?.some((alias) => alias.toLowerCase() === normalizedLanguage)
      );
    },
  )?.[0];
}
