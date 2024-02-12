import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  mergeCSSClasses,
} from "@blocknote/core";
import { MantineProvider } from "@mantine/core";

import {
  HTMLAttributes,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import usePrefersColorScheme from "use-prefers-color-scheme";
import { FormattingToolbarPositioner } from "../components/FormattingToolbar/FormattingToolbarPositioner";
import { HyperlinkToolbarPositioner } from "../components/HyperlinkToolbar/HyperlinkToolbarPositioner";
import { ImageToolbarPositioner } from "../components/ImageToolbar/ImageToolbarPositioner";
import { SideMenuPositioner } from "../components/SideMenu/SideMenuPositioner";
import { SlashMenuPositioner } from "../components/SlashMenu/SlashMenuPositioner";
import { TableHandlesPositioner } from "../components/TableHandles/TableHandlePositioner";
import { useEditorChange } from "../hooks/useEditorChange";
import { useEditorSelectionChange } from "../hooks/useEditorSelectionChange";
import { BlockNoteContext, useBlockNoteContext } from "./BlockNoteContext";
import {
  Theme,
  applyBlockNoteCSSVariablesFromTheme,
  removeBlockNoteCSSVariables,
} from "./BlockNoteTheme";
import { EditorContent } from "./EditorContent";
import "./styles.css";

const mantineTheme = {
  // Removes button press effect
  activeClassName: "",
};

const emptyFn = (_editor: any) => {
  // noop
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
    /**
     * Locks the editor from being editable by the user if set to `false`.
     */
    editable?: boolean;
    /**
     * A callback function that runs whenever the text cursor position or selection changes.
     */
    onSelectionChange?: (
      editor: BlockNoteEditor<BSchema, ISchema, SSchema>
    ) => void;

    /**
     * A callback function that runs whenever the editor's contents change.
     */
    onChange?: (editor: BlockNoteEditor<BSchema, ISchema, SSchema>) => void;

    children?: ReactNode;
  } & Omit<
    HTMLAttributes<HTMLDivElement>,
    "onChange" | "onSelectionChange" | "children"
  >
) {
  const {
    editor,
    className,
    theme,
    children,
    editable,
    onSelectionChange,
    onChange,
    ...rest
  } = props;

  const existingContext = useBlockNoteContext();

  const systemColorScheme = usePrefersColorScheme();
  const defaultColorScheme =
    existingContext?.colorSchemePreference || systemColorScheme;

  const [editorColorScheme, setEditorColorScheme] = useState<
    "light" | "dark" | undefined
  >(undefined);

  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      editor._tiptapEditor.mount(node); // maybe cleaner to use "mergeRefs"

      if (!node) {
        // todo: clean variables?
        return;
      }

      removeBlockNoteCSSVariables(node);

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
            theme[defaultColorScheme === "dark" ? "dark" : "light"],
            node
          );
          setEditorColorScheme(
            defaultColorScheme === "dark" ? "dark" : "light"
          );
          return;
        }

        applyBlockNoteCSSVariablesFromTheme(theme, node);
        setEditorColorScheme(undefined);
        return;
      }

      setEditorColorScheme(defaultColorScheme === "dark" ? "dark" : "light");
    },
    [defaultColorScheme, theme, editor._tiptapEditor]
  );

  useEditorChange(onChange || emptyFn, editor);
  useEditorSelectionChange(onSelectionChange || emptyFn, editor);

  useEffect(() => {
    if (editable === false) {
      editor.isEditable = false;
    } else {
      editor.isEditable = true;
    }
  }, [editable, editor]);

  const renderChildren = useMemo(() => {
    return (
      children || (
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
      )
    );
  }, [editor, children]);

  const context = useMemo(() => {
    return {
      ...existingContext,
      editor,
    };
  }, [existingContext, editor]);

  return (
    // `cssVariablesSelector` scopes Mantine CSS variables to only the editor,
    // as proposed here:  https://github.com/orgs/mantinedev/discussions/5685
    <MantineProvider theme={mantineTheme} cssVariablesSelector=".bn-container">
      <BlockNoteContext.Provider value={context as any}>
        <EditorContent editor={editor}>
          <div
            className={mergeCSSClasses("bn-container", className || "")}
            data-color-scheme={editorColorScheme}
            {...rest}
            ref={containerRef}>
            {renderChildren}
          </div>
        </EditorContent>
      </BlockNoteContext.Provider>
    </MantineProvider>
  );
}
