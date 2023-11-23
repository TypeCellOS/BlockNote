// import logo from './logo.svg'
import "@blocknote/core/style.css";
import {
  BlockNoteView,
  createReactStyleSpec,
  useBlockNote,
} from "@blocknote/react";

import { defaultStyleSpecs } from "@blocknote/core";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

const small = createReactStyleSpec(
  {
    type: "small",
    propSchema: "boolean",
  },
  {
    render: (props) => {
      return <small ref={props.contentRef}></small>;
    },
  }
);

const fontSize = createReactStyleSpec(
  {
    type: "fontSize",
    propSchema: "string",
  },
  {
    render: (props) => {
      return (
        <span ref={props.contentRef} style={{ fontSize: props.value }}></span>
      );
    },
  }
);

const customReactStyles = {
  ...defaultStyleSpecs,
  small,
  fontSize,
};

export function ReactStyles() {
  const editor = useBlockNote({
    styleSpecs: customReactStyles,
    onEditorContentChange: (editor) => {
      console.log(editor.topLevelBlocks);
    },
    domAttributes: {
      editor: {
        class: "editor",
        "data-test": "editor",
      },
    },
    initialContent: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "large text",
            styles: {
              fontSize: "30px",
            },
          },
          {
            type: "text",
            text: "small text",
            styles: {
              small: true,
            },
          },
        ],
      },
    ],
  });

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return <BlockNoteView className="root" editor={editor} />;
}
