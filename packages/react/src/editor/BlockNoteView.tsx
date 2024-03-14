import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  mergeCSSClasses,
} from "@blocknote/core";
import { MantineProvider } from "@mantine/core";

import React, {
  HTMLAttributes,
  ReactNode,
  Ref,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import usePrefersColorScheme from "use-prefers-color-scheme";
import { useEditorChange } from "../hooks/useEditorChange";
import { useEditorSelectionChange } from "../hooks/useEditorSelectionChange";
import { mergeRefs } from "../util/mergeRefs";
import { BlockNoteContext, useBlockNoteContext } from "./BlockNoteContext";
import {
  BlockNoteDefaultUI,
  BlockNoteDefaultUIProps,
} from "./BlockNoteDefaultUI";
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

const emptyFn = () => {
  // noop
};

function BlockNoteViewComponent<
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
    onSelectionChange?: () => void;

    /**
     * A callback function that runs whenever the editor's contents change.
     */
    onChange?: () => void;

    children?: ReactNode;

    ref?: Ref<HTMLDivElement> | undefined; // only here to get types working with the generics. Regular form doesn't work
  } & Omit<
    HTMLAttributes<HTMLDivElement>,
    "onChange" | "onSelectionChange" | "children"
  > &
    BlockNoteDefaultUIProps,
  ref: React.Ref<HTMLDivElement>
) {
  const {
    editor,
    className,
    theme,
    children,
    editable,
    onSelectionChange,
    onChange,
    formattingToolbar,
    linkToolbar,
    slashMenu,
    sideMenu,
    imageToolbar,
    tableHandles,
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
    [defaultColorScheme, theme]
  );

  useEditorChange(onChange || emptyFn, editor);
  useEditorSelectionChange(onSelectionChange || emptyFn, editor);

  useEffect(() => {
    editor.isEditable = editable !== false;
  }, [editable, editor]);

  const renderChildren = useMemo(() => {
    return (
      <>
        {children}
        <BlockNoteDefaultUI
          formattingToolbar={formattingToolbar}
          linkToolbar={linkToolbar}
          slashMenu={slashMenu}
          sideMenu={sideMenu}
          imageToolbar={imageToolbar}
          tableHandles={tableHandles}
        />
      </>
    );
  }, [
    children,
    formattingToolbar,
    linkToolbar,
    imageToolbar,
    sideMenu,
    slashMenu,
    tableHandles,
  ]);

  const context = useMemo(() => {
    return {
      ...existingContext,
      editor,
    };
  }, [existingContext, editor]);

  const refs = useMemo(() => {
    return mergeRefs([containerRef, editor._tiptapEditor.mount, ref]);
  }, [containerRef, editor._tiptapEditor.mount, ref]);

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
            ref={refs}>
            {renderChildren}
          </div>
        </EditorContent>
      </BlockNoteContext.Provider>
    </MantineProvider>
  );
}

export const BlockNoteView = React.forwardRef(
  BlockNoteViewComponent
) as typeof BlockNoteViewComponent; // need hack to get types working with generics
