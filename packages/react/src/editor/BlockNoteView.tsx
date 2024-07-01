import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  mergeCSSClasses,
} from "@blocknote/core";

import React, {
  ComponentProps,
  HTMLAttributes,
  ReactNode,
  Ref,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePrefersColorScheme } from "use-prefers-color-scheme";
import { useEditorChange } from "../hooks/useEditorChange";
import { useEditorSelectionChange } from "../hooks/useEditorSelectionChange";
import { BlockNoteContext, useBlockNoteContext } from "./BlockNoteContext";
import {
  BlockNoteDefaultUI,
  BlockNoteDefaultUIProps,
} from "./BlockNoteDefaultUI";
import { EditorContent } from "./EditorContent";
import "./styles.css";

const emptyFn = () => {
  // noop
};

export type BlockNoteViewProps<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
> = {
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>;

  theme?: "light" | "dark";

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
  BlockNoteDefaultUIProps;

function BlockNoteViewComponent<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(
  props: BlockNoteViewProps<BSchema, ISchema, SSchema>,
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
    filePanel,
    tableHandles,
    ...rest
  } = props;

  // Used so other components (suggestion menu) can set
  // aria related props to the contenteditable div
  const [contentEditableProps, setContentEditableProps] =
    useState<Record<string, any>>();

  const existingContext = useBlockNoteContext();
  const systemColorScheme = usePrefersColorScheme();
  const defaultColorScheme =
    existingContext?.colorSchemePreference || systemColorScheme;

  const editorColorScheme =
    theme || (defaultColorScheme === "dark" ? "dark" : "light");

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
          filePanel={filePanel}
          tableHandles={tableHandles}
        />
      </>
    );
  }, [
    children,
    formattingToolbar,
    linkToolbar,
    filePanel,
    sideMenu,
    slashMenu,
    tableHandles,
  ]);

  const context = useMemo(() => {
    return {
      ...existingContext,
      editor,
      setContentEditableProps,
    };
  }, [existingContext, editor]);

  return (
    <BlockNoteContext.Provider value={context as any}>
      <EditorContent editor={editor}>
        <div
          className={mergeCSSClasses(
            "bn-container",
            editorColorScheme || "",
            className || ""
          )}
          data-color-scheme={editorColorScheme}
          {...rest}
          ref={ref}>
          <div
            aria-autocomplete="list"
            aria-haspopup="listbox"
            ref={editor._tiptapEditor.mount}
            {...contentEditableProps}
          />
          {renderChildren}
        </div>
      </EditorContent>
    </BlockNoteContext.Provider>
  );
}

// https://fettblog.eu/typescript-react-generic-forward-refs/
export const BlockNoteViewRaw = React.forwardRef(BlockNoteViewComponent) as <
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(
  props: ComponentProps<
    typeof BlockNoteViewComponent<BSchema, ISchema, SSchema>
  > & {
    ref?: React.ForwardedRef<HTMLDivElement>;
  }
) => ReturnType<typeof BlockNoteViewComponent<BSchema, ISchema, SSchema>>;
