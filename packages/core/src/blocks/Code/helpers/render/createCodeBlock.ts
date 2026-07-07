import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import type { BlockFromConfig } from "../../../../schema/index.js";

// Select dropdown to change the block's language. Assumes `block` has a `language` prop.
export const createLanguageSelect = (
  block: BlockFromConfig<any, any, any>,
  editor: BlockNoteEditor<any>,
  selectedLanguage: string,
  supportedLanguages: Record<
    string,
    {
      name: string;
    }
  >,
) => {
  if (!(selectedLanguage in supportedLanguages)) {
    throw new Error(`Language ${selectedLanguage} is not supported.`);
  }

  const select = document.createElement("select");
  Object.entries(supportedLanguages).forEach(([id, { name }]) => {
    const option = document.createElement("option");
    option.value = id;
    option.text = name;
    select.appendChild(option);
  });
  select.value = selectedLanguage;

  const handleLanguageChange = (event: Event) => {
    if (!editor.isEditable) {
      return;
    }

    editor.updateBlock(block.id, {
      props: { language: (event.target as HTMLSelectElement).value },
    });
  };

  if (editor.isEditable) {
    select.addEventListener("change", handleLanguageChange);
  } else {
    select.disabled = true;
  }

  const selectWrapper = document.createElement("div");
  selectWrapper.contentEditable = "false";
  selectWrapper.appendChild(select);

  return {
    dom: selectWrapper,
    destroy: () => select.removeEventListener("change", handleLanguageChange),
  };
};

// Renders the block's inline content as code, alongside a language picker, if multiple languages
// are supported.
export const createCodeBlock = (
  block: BlockFromConfig<any, any, any>,
  editor: BlockNoteEditor<any>,
  options?: {
    selectedLanguage: string;
    supportedLanguages: Record<
      string,
      {
        name: string;
      }
    >;
  },
) => {
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  pre.appendChild(code);

  const sourceBlock = document.createDocumentFragment();

  let languageSelect: ReturnType<typeof createLanguageSelect> | undefined =
    undefined;
  if (options && Object.keys(options.supportedLanguages).length > 1) {
    languageSelect = createLanguageSelect(
      block,
      editor,
      options.selectedLanguage,
      options.supportedLanguages,
    );

    sourceBlock.appendChild(languageSelect.dom);
  }

  sourceBlock.appendChild(pre);

  return {
    dom: sourceBlock,
    contentDOM: code,
    destroy: () => {
      languageSelect?.destroy();
    },
  };
};
