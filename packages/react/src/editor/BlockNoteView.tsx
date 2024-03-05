import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  mergeCSSClasses,
  StyleSchema,
} from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import { EditorContent } from "@tiptap/react";
import { HTMLAttributes, ReactNode, useEffect, useState } from "react";
import usePrefersColorScheme from "use-prefers-color-scheme";
import {
  Theme,
  applyBlockNoteCSSVariablesFromTheme,
  removeBlockNoteCSSVariables,
} from "./BlockNoteTheme";
import { FormattingToolbarPositioner } from "../components/FormattingToolbar/FormattingToolbarPositioner";
import { HyperlinkToolbarPositioner } from "../components/HyperlinkToolbar/HyperlinkToolbarPositioner";
import { ImageToolbarPositioner } from "../components/ImageToolbar/ImageToolbarPositioner";
import { SideMenuPositioner } from "../components/SideMenu/SideMenuPositioner";
import { SlashMenuPositioner } from "../components/SlashMenu/SlashMenuPositioner";
import { TableHandlesPositioner } from "../components/TableHandles/TableHandlePositioner";
import "./styles.css";

const mantineTheme = {
  // Removes button press effect
  activeClassName: "",
};

export function BlockNoteView<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(
  props: {
    editor: BlockNoteEditor<BSchema, ISchema, SSchema>;
    theme?:
      | "light"
      | "dark"
      | Theme
      | {
          light: Theme;
          dark: Theme;
        };
    children?: ReactNode;
  } & HTMLAttributes<HTMLDivElement>
) {
  const { editor, className, theme, children, ...rest } = props;

  const systemColorScheme = usePrefersColorScheme();

  const [editorColorScheme, setEditorColorScheme] = useState<
    "light" | "dark" | undefined
  >(undefined);

  useEffect(() => {
    removeBlockNoteCSSVariables(editor.domElement.parentElement!);

    if (theme === "light") {
      setEditorColorScheme("light");
      return;
    }

    if (theme === "dark") {
      setEditorColorScheme("dark");
      return;
    }

    if (typeof theme === "object") {
      if ("light" in theme && "dark" in theme) {
        applyBlockNoteCSSVariablesFromTheme(
          theme[systemColorScheme === "dark" ? "dark" : "light"],
          editor.domElement.parentElement!
        );
        setEditorColorScheme(systemColorScheme === "dark" ? "dark" : "light");
        return;
      }

      applyBlockNoteCSSVariablesFromTheme(
        theme,
        editor.domElement.parentElement!
      );
      setEditorColorScheme(undefined);
      return;
    }

    setEditorColorScheme(systemColorScheme === "dark" ? "dark" : "light");
  }, [systemColorScheme, editor.domElement, theme]);

  return (
    <MantineProvider theme={mantineTheme}>
      <EditorContent
        editor={editor._tiptapEditor}
        className={mergeCSSClasses("bn-container", className || "")}
        data-color-scheme={editorColorScheme}
        {...rest}>
        {children || (
          <>
            <FormattingToolbarPositioner editor={editor} />
            <HyperlinkToolbarPositioner editor={editor} />
            <SlashMenuPositioner editor={editor} />
            <SideMenuPositioner editor={editor} />
            <ImageToolbarPositioner editor={editor} />
            {editor.blockSchema.table && (
              <TableHandlesPositioner editor={editor as any} />
            )}
          </>
        )}
      </EditorContent>
    </MantineProvider>
  );
}
