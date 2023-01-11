import { BlockNoteEditor } from "@blocknote/core";
import "./index.css";

const editor = new BlockNoteEditor({
  element: document.getElementById("root")!,
  uiFactories: {
    // Create an example bubble menu which just consists of a bold toggle
    bubbleMenuFactory: (props) => {
      const element = document.createElement("a");
      element.href = "#";
      element.text = "set bold";
      element.style.position = "absolute";
      element.style.background = "gray";
      element.style.padding = "10px";
      element.addEventListener("click", (e) => {
        props.toggleBold();
        e.preventDefault();
      });
      document.body.appendChild(element);

      return {
        element,
        show: (params) => {
          element.style.display = "block";
        },
        hide: () => {
          element.style.display = "none";
        },
        update: (params) => {
          element.text = params.boldIsActive ? "unset bold" : "set bold";
          element.style.top = params.selectionBoundingBox.y + "px";
          element.style.left = params.selectionBoundingBox.x + "px";
        },
      };
    },
    //   hyperlinkMenuFactory: ReactHyperlinkMenuFactory,
    //   suggestionsMenuFactory: ReactSuggestionsMenuFactory,
  },
  onUpdate: ({ editor }) => {
    console.log(editor.getJSON());
    (window as any).ProseMirror = editor; // Give tests a way to get editor instance
  },
  editorProps: {
    attributes: {
      class: "editor",
    },
  },
});

console.log("editor created", editor);
