// import logo from './logo.svg'
import "@blocknote/core/style.css";
import {
  BlockNoteView,
  defaultReactSlashMenuItems,
  useBlockNote,
} from "@blocknote/react";
import styles from "./App.module.css";
import { Alert, insertAlert } from "../../../tests/utils/customblocks/Alert";
import { defaultBlockSchema } from "@blocknote/core";
import { Node } from "@tiptap/core";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    nodeViewParagraph: {
      toggleParagraphType: (posBeforeParagraph: number) => ReturnType;
    };
  }
}

const NodeViewParagraph = Node.create({
  name: "nodeViewParagraph",
  content: "inline*",
  group: "blockContent",

  renderHTML() {
    const blockContent = document.createElement("div");
    blockContent.setAttribute("class", "blockContent");
    blockContent.setAttribute("data-content-type", "nodeViewParagraph");

    const paragraph = document.createElement("div");
    blockContent.appendChild(paragraph);

    return {
      dom: blockContent,
      contentDOM: paragraph,
    };
  },

  addNodeView() {
    return () => {
      const blockContent = document.createElement("div");
      blockContent.setAttribute("class", "blockContent");
      blockContent.setAttribute("data-content-type", "nodeViewParagraph");

      const paragraph = document.createElement("p");
      blockContent.appendChild(paragraph);

      return {
        dom: blockContent,
        contentDOM: paragraph,
        update: (node) => {
          console.log("Update");
          return node.type.name === this.type.name;
        },
        destroy: () => {
          console.log("Destroy");
        },
      };
    };
  },

  addCommands() {
    return {
      toggleParagraphType:
        (posBeforeParagraph) =>
        ({ state, dispatch }) => {
          if (dispatch) {
            state.tr.setNodeMarkup(
              posBeforeParagraph,
              state.doc.resolve(posBeforeParagraph + 1).node().type.name ===
                "paragraph"
                ? state.schema.nodes["nodeViewParagraph"]
                : state.schema.nodes["paragraph"]
            );
          }

          return true;
        },
    };
  },
});

function App() {
  const editor = useBlockNote({
    editorDOMAttributes: {
      class: styles.editor,
      "data-test": "editor",
    },
    theme: "light",
    blockSchema: {
      ...defaultBlockSchema,
      nodeViewParagraph: {
        propSchema: {},
        node: NodeViewParagraph as any,
      },
    },
    onEditorReady(editor) {
      console.log("READY");
      const button = document.querySelector("#button")!;
      button.addEventListener("click", () => {
        editor!._tiptapEditor.commands.toggleParagraphType(2);
      });
    },
    // slashCommands: [...defaultReactSlashMenuItems, insertAlert],
  });

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return <BlockNoteView editor={editor} />;
}

export default App;
