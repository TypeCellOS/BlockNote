import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { BlockFromConfig } from "../../schema/index.js";
import type { CodeBlockConfig, CodeBlockOptions } from "./block.js";

/**
 * Creates a function that renders the editable source of a code block as a
 * `<pre><code>`, with a language selection dropdown. This is the default
 * rendering for languages that don't support previews, and is reused as the
 * source popup's content for languages that do.
 */
export function createRenderSource(options: CodeBlockOptions) {
  return (
    block: BlockFromConfig<CodeBlockConfig, any, any>,
    editor: BlockNoteEditor<any>,
  ) => {
    const language = block.props.language || options.defaultLanguage || "text";

    const pre = document.createElement("pre");
    const code = document.createElement("code");
    pre.appendChild(code);

    const dom = document.createDocumentFragment();

    let removeSelectChangeListener: (() => void) | undefined;
    if (options.supportedLanguages) {
      const select = document.createElement("select");
      Object.entries(options.supportedLanguages).forEach(([id, { name }]) => {
        const option = document.createElement("option");
        option.value = id;
        option.text = name;
        select.appendChild(option);
      });
      select.value = language;

      if (editor.isEditable) {
        const handleLanguageChange = (event: Event) => {
          editor.updateBlock(block.id, {
            props: { language: (event.target as HTMLSelectElement).value },
          });
        };
        select.addEventListener("change", handleLanguageChange);
        removeSelectChangeListener = () =>
          select.removeEventListener("change", handleLanguageChange);
      } else {
        select.disabled = true;
      }

      const selectWrapper = document.createElement("div");
      selectWrapper.contentEditable = "false";
      selectWrapper.appendChild(select);
      dom.appendChild(selectWrapper);
    }

    dom.appendChild(pre);

    return {
      dom,
      contentDOM: code,
      destroy: () => {
        removeSelectChangeListener?.();
      },
    };
  };
}
