// import logo from './logo.svg'
import "@blocknote/core/style.css";
import {
  BlockNoteView,
  getDefaultReactSlashMenuItems,
  useBlockNote,
  Theme,
  lightDefaultTheme,
  darkDefaultTheme,
} from "@blocknote/react";
import styles from "./App.module.css";
import { BlockSchema, defaultBlockSchema } from "@blocknote/core";
import { Image, insertImage } from "../../../tests/utils/customblocks/Image";
import {
  insertReactImage,
  ReactImage,
} from "../../../tests/utils/customblocks/ReactImage";
import { useEffect, useState } from "react";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

const lightRedTheme = {
  colors: {
    editor: {
      text: "#222222",
      background: "#ffffff",
    },
    menu: {
      text: "#ffffff",
      background: "#9b0000",
    },
    tooltip: {
      text: "#ffffff",
      background: "#b00000",
    },
    hovered: {
      text: "#ffffff",
      background: "#b00000",
    },
    selected: {
      text: "#ffffff",
      background: "#c50000",
    },
    disabled: {
      text: "#9b0000",
      background: "#7d0000",
    },
    shadow: "#640000",
    border: "#870000",
    sideMenu: "#bababa",
    // TODO: Update
    highlightColors: lightDefaultTheme.colors.highlightColors,
  },
  borderRadius: 4,
  fontFamily: "Helvetica Neue, sans-serif",
} satisfies Partial<Theme>;

const darkRedTheme = {
  ...lightRedTheme,
  colors: {
    ...lightRedTheme.colors,
    editor: {
      text: "#ffffff",
      background: "#9b0000",
    },
    sideMenu: "#ffffff",
    // TODO: Update
    highlightColors: darkDefaultTheme.colors.highlightColors,
  },
} satisfies Partial<Theme>;

const schema = {
  ...defaultBlockSchema,
  image: Image,
  reactImage: ReactImage,
} satisfies BlockSchema;

function App() {
  const [theme, setTheme] = useState<
    typeof darkRedTheme | typeof lightRedTheme
  >(
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? lightRedTheme
      : darkRedTheme
  );

  useEffect(() => {
    const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
    const mqListener = (e: MediaQueryListEvent) =>
      setTheme(e.matches ? lightRedTheme : darkRedTheme);
    darkThemeMq.addEventListener("change", mqListener);

    return () => darkThemeMq.removeEventListener("change", mqListener);
  }, []);

  const editor = useBlockNote(
    {
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
        blockContainer: {
          class: "customBlockContainerClass",
          "data-custom-block-container-attr": "blockContainer",
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
    },
    [theme]
  );

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return (
    <BlockNoteView
      editor={editor}
      theme={{
        // light: lightRedTheme,
        dark: darkRedTheme,
      }}
      componentStyles={{
        Editor: {
          backgroundColor: theme.colors.editor.background,
          borderRadius: theme.borderRadius,
          border: `1px solid ${theme.colors.border}`,
          boxShadow: `0 4px 12px ${theme.colors.shadow}`,
          height: "100vw",
          ".ProseMirror": {
            backgroundColor: theme.colors.editor.background,
            borderRadius: theme.borderRadius,
            color: theme.colors.editor.text,
            fontFamily: theme.fontFamily,
          },
        },
      }}
    />
  );
}

export default App;
