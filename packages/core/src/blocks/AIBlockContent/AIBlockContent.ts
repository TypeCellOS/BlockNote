import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import {
  BlockConfig,
  BlockFromConfig,
  createBlockSpec,
  PropSchema,
} from "../../schema";
import { defaultProps } from "../defaultProps";

export const mockAIModelCall = async (_prompt: string) => {
  return new Promise<string>((resolve) => {
    setTimeout(() => {
      resolve(
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
      );
    }, 1000);
  });
};

export const aiPropSchema = {
  ...defaultProps,
  prompt: {
    default: "" as const,
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
    const generateResponseCallback = async () => {
      generateButton.textContent = "Generating...";

      editor.updateBlock(block, {
        type: "ai",
        props: { prompt: span.innerText },
        content: await mockAIModelCall(block.props.prompt),
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

          generateResponseCallback();
        }
      },
      true
    );
    promptBox.appendChild(span);

    const generateButton = document.createElement("button");
    generateButton.contentEditable = "false";
    generateButton.textContent = "Generate";
    generateButton.addEventListener("click", generateResponseCallback);
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
  render: aiRender,
  toExternalHTML: aiToExternalHTML,
});
