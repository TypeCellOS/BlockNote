import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  mergeCSSClasses,
  StyleSchema,
} from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import { EditorContent } from "@tiptap/react";
import { HTMLAttributes, ReactNode, useEffect } from "react";
import usePrefersColorScheme from "use-prefers-color-scheme";
import { Theme, themeToCSSVariables } from "./BlockNoteTheme";
import { FormattingToolbarPositioner } from "../components/FormattingToolbar/FormattingToolbarPositioner";
import { HyperlinkToolbarPositioner } from "../components/HyperlinkToolbar/HyperlinkToolbarPositioner";
import { ImageToolbarPositioner } from "../components/ImageToolbar/ImageToolbarPositioner";
import { SideMenuPositioner } from "../components/SideMenu/SideMenuPositioner";
import { SlashMenuPositioner } from "../components/SlashMenu/SlashMenuPositioner";
import { TableHandlesPositioner } from "../components/TableHandles/TableHandlePositioner";
import { darkDefaultTheme, lightDefaultTheme } from "./defaultThemes";
import "@mantine/core/styles.css";
import "./styles.css";

// Renders the editor as well as all menus & toolbars using default styles.
function BaseBlockNoteView<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(
  props: {
    editor: BlockNoteEditor<BSchema, ISchema, SSchema>;
    children?: ReactNode;
  } & HTMLAttributes<HTMLDivElement>
) {
  const { editor, children, className, ...rest } = props;

  return (
    <EditorContent
      editor={props.editor?._tiptapEditor}
      className={mergeCSSClasses("bn-editor-wrapper", props.className || "")}
      {...rest}>
      {props.children || (
        <>
          <FormattingToolbarPositioner editor={props.editor} />
          <HyperlinkToolbarPositioner editor={props.editor} />
          <SlashMenuPositioner editor={props.editor} />
          <SideMenuPositioner editor={props.editor} />
          <ImageToolbarPositioner editor={props.editor} />
          {props.editor.blockSchema.table && (
            <TableHandlesPositioner editor={props.editor as any} />
          )}
        </>
      )}
    </EditorContent>
  );
}

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
  const {
    theme = { light: lightDefaultTheme, dark: darkDefaultTheme },
    ...rest
  } = props;

  const preferredTheme = usePrefersColorScheme();

  useEffect(() => {
    if (theme === "light") {
      themeToCSSVariables(lightDefaultTheme);
    } else if (theme === "dark") {
      themeToCSSVariables(darkDefaultTheme);
    } else if (
      typeof theme === "object" &&
      "light" in theme &&
      "dark" in theme
    ) {
      themeToCSSVariables(theme[preferredTheme === "dark" ? "dark" : "light"]);
    } else {
      themeToCSSVariables(theme);
    }
  }, [preferredTheme, theme]);

  return (
    <MantineProvider theme={mantineTheme}>
      <BaseBlockNoteView {...rest} />
    </MantineProvider>
  );
}
