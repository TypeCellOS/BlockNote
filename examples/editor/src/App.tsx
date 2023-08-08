// import logo from './logo.svg'
import "@blocknote/core/style.css";
import {
  BlockNoteView,
  getDefaultReactSlashMenuItems,
  useBlockNote,
  Theme,
  defaultTheme,
} from "@blocknote/react";
import styles from "./App.module.css";
import { BlockSchema, defaultBlockSchema } from "@blocknote/core";
import { Image, insertImage } from "../../../tests/utils/customblocks/Image";
import {
  insertReactImage,
  ReactImage,
} from "../../../tests/utils/customblocks/ReactImage";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

const redTheme: Partial<Theme> = {
  colors: {
    editor: {
      text: {
        light: "#222222",
        dark: "#ffffff",
      },
      background: {
        light: "#ffffff",
        dark: "#9b0000",
      },
    },
    menu: {
      text: {
        light: "#ffffff",
        dark: "#ffffff",
      },
      background: {
        light: "#9b0000",
        dark: "#9b0000",
      },
    },
    tooltip: {
      text: {
        light: "#ffffff",
        dark: "#ffffff",
      },
      background: {
        light: "#b00000",
        dark: "#b00000",
      },
    },
    hovered: {
      text: {
        light: "#ffffff",
        dark: "#ffffff",
      },
      background: {
        light: "#b00000",
        dark: "#b00000",
      },
    },
    selected: {
      text: {
        light: "#ffffff",
        dark: "#ffffff",
      },
      background: {
        light: "#c50000",
        dark: "#c50000",
      },
    },
    disabled: {
      text: {
        light: "#9b0000",
        dark: "#9b0000",
      },
      background: {
        light: "#7d0000",
        dark: "#7d0000",
      },
    },
    shadow: {
      light: "#640000",
      dark: "#640000",
    },
    border: {
      light: "#870000",
      dark: "#870000",
    },
    sideMenu: {
      light: "#bababa",
      dark: "#ffffff",
    },
    // TODO: Update
    highlightColors: defaultTheme.colors.highlightColors,
  },
  borderRadius: 4,
  fontFamily: "Helvetica Neue, sans-serif",
};

const schema = {
  ...defaultBlockSchema,
  image: Image,
  reactImage: ReactImage,
} satisfies BlockSchema;

function App() {
  const editor = useBlockNote({
    onEditorContentChange: (editor) => {
      console.log(editor.topLevelBlocks);
    },
    blockSchema: schema,
    slashMenuItems: [
      ...getDefaultReactSlashMenuItems(schema),
      insertImage,
      insertReactImage,
    ],
    domAttributes: {
      editor: {
        class: styles.editor + " customEditorClass",
        "data-custom-editor-attr": "editor",
      },
      block: {
        class: "customBlockClass",
        "data-custom-block-attr": "block",
      },
      blockGroup: {
        class: "customBlockGroupClass",
        "data-custom-block-group-attr": "blockGroup",
      },
      blockContent: {
        class: "customBlockContentClass",
        "data-custom-block-content-attr": "blockContent",
      },
      inlineContent: {
        class: "customInlineContentClass",
        "data-custom-inline-content-attr": "inlineContent",
      },
    },
  });

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return (
    <BlockNoteView editor={editor} useDarkTheme={true} customTheme={redTheme} />
  );
}

export default App;
