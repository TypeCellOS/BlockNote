import {
  BlockConfig,
  BlockFromConfig,
  BlockNoteEditor,
  PropSchema,
  createBlockSpec,
  defaultProps,
} from "@blocknote/core";

import { mockAIReplaceBlockContent } from "./mockAIFunctions";

export const aiPropSchema = {
  ...defaultProps,
  prompt: {
    default: "" as const,
  },
  timeGenerated: {
    default: 0 as const,
  },
} satisfies PropSchema;

export const aiBlockConfig = {
  type: "ai" as const,
  propSchema: aiPropSchema,
  content: "inline",
} satisfies BlockConfig;

export const aiRender = (
  block: BlockFromConfig<typeof aiBlockConfig, any, any>,
  editor: BlockNoteEditor<any, any, any>
) => {
  if (!block.props.prompt) {
    const replaceContent = async () => {
      const prompt = span.innerText;
      // TODO: Updating text content in this way isn't working
      generateButton.textContent = "Generating...";

      await mockAIReplaceBlockContent(editor, prompt, block);
      editor.updateBlock(block, {
        props: {
          timeGenerated: Date.now(),
        },
      });
    };

    const promptBox = document.createElement("div");
    promptBox.className = "bn-ai-prompt-box";

    const icon = document.createElement("span");
    icon.contentEditable = "false";
    promptBox.appendChild(icon);
    icon.outerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.0007 1.20825 18.3195 3.68108 20.7923 4.99992 18.3195 6.31876 17.0007 8.79159 15.6818 6.31876 13.209 4.99992 15.6818 3.68108 17.0007 1.20825ZM8.00065 4.33325 10.6673 9.33325 15.6673 11.9999 10.6673 14.6666 8.00065 19.6666 5.33398 14.6666.333984 11.9999 5.33398 9.33325 8.00065 4.33325ZM19.6673 16.3333 18.0007 13.2083 16.334 16.3333 13.209 17.9999 16.334 19.6666 18.0007 22.7916 19.6673 19.6666 22.7923 17.9999 19.6673 16.3333Z"></path></svg>';

    const span = document.createElement("span");
    editor.domElement.addEventListener(
      "keydown",
      (event) => {
        const currentBlock = editor.getTextCursorPosition().block;

        if (
          event.key === "Enter" &&
          !editor.getSelection() &&
          currentBlock.id === block.id &&
          currentBlock.props.prompt === ""
        ) {
          event.preventDefault();
          event.stopPropagation();

          replaceContent();
        }
      },
      true
    );
    promptBox.appendChild(span);

    const generateButton = document.createElement("button");
    generateButton.contentEditable = "false";
    generateButton.textContent = "Generate";
    generateButton.addEventListener("click", replaceContent);
    promptBox.appendChild(generateButton);

    return {
      dom: promptBox,
      contentDOM: span,
    };
  }

  const paragraph = document.createElement("p");

  return {
    dom: paragraph,
    contentDOM: paragraph,
  };
};

export const aiToExternalHTML = (
  block: BlockFromConfig<typeof aiBlockConfig, any, any>
) => {
  if (!block.props.prompt) {
    const div = document.createElement("p");

    return {
      dom: div,
      contentDOM: div,
    };
  }

  const paragraph = document.createElement("p");

  return {
    dom: paragraph,
    contentDOM: paragraph,
  };
};

export const AIBlock = createBlockSpec(aiBlockConfig, {
  render: aiRender as any, // TODO?
  toExternalHTML: aiToExternalHTML,
});
