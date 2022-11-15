import { CustomBlock } from "./customBlock";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";

export const EditorBlock: CustomBlock = {
  type: "editor",
  atom: true,
  selectable: false,

  attributes: {},

  element: (props) => {
    console.log(props);
    const element = document.createElement("div");
    const editorElement = document.createElement("div");
    element.appendChild(editorElement);

    new Editor({
      element: editorElement,
      extensions: [Document, Paragraph, Text],
      content: "<p>Example Text</p>",
      autofocus: false,
      editable: true,
      injectCSS: false,
      onSelectionUpdate: ({ editor }) => {
        console.log("Embedded editor:", editor.state.selection);
      },
    });

    return {
      element: element,
    };
  },
};
