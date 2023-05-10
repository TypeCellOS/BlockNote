import "@blocknote/core/style.css";
import {
  BlockNoteView,
  defaultReactSlashMenuItems,
  ReactSlashMenuItem,
  useBlockNote,
} from "@blocknote/react";
import styles from "./App.module.css";
import { createBlockSpec, defaultBlockSchema } from "@blocknote/core";
import { RiImage2Fill } from "react-icons/ri";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

const Image = createBlockSpec({
  type: "image",
  propSchema: {
    src: {
      default: "https://via.placeholder.com/150",
    },
  },
  containsInlineContent: true,
  render: (block) => {
    const image = document.createElement("img");
    image.setAttribute("src", block().props.src);
    image.setAttribute("contenteditable", "false");
    image.setAttribute("border", "1px solid black");

    const caption = document.createElement("div");

    const parent = document.createElement("div");
    parent.appendChild(image);
    parent.appendChild(caption);

    return {
      dom: parent,
      contentDOM: caption,
    };
  },
});

const customSchema = {
  ...defaultBlockSchema,
  image: Image,
} as const;

const insertImage = new ReactSlashMenuItem<typeof customSchema>(
  "insertImage",
  (editor) => {
    const src = prompt("Enter image URL");
    if (src) {
      editor.insertBlocks(
        [
          {
            type: "image",
            props: {
              src,
            },
          },
        ],
        editor.getTextCursorPosition().block,
        "after"
      );
    }
  },
  ["img", "picture", "media"],
  "Media",
  <RiImage2Fill />,
  "Insert an image"
);

function App() {
  const editor = useBlockNote<typeof customSchema>({
    onEditorContentChange: (editor) => {
      console.log(editor.topLevelBlocks);
    },
    editorDOMAttributes: {
      class: styles.editor,
      "data-test": "editor",
    },
    blockSchema: {
      ...defaultBlockSchema,
      image: Image,
    },
    slashCommands: [
      ...defaultReactSlashMenuItems<typeof customSchema>(),
      insertImage,
    ],
  });

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return <BlockNoteView editor={editor} />;
}

export default App;
