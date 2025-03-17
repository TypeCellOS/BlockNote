import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  mergeCSSClasses,
} from "@blocknote/core";
import React, {
  HTMLAttributes,
  ReactNode,
  Ref,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useBlockNoteEditor } from "../hooks/useBlockNoteEditor.js";
import { useEditorChange } from "../hooks/useEditorChange.js";
import { useEditorSelectionChange } from "../hooks/useEditorSelectionChange.js";
import { usePrefersColorScheme } from "../hooks/usePrefersColorScheme.js";
import {
  BlockNoteContext,
  BlockNoteContextValue,
  useBlockNoteContext,
} from "./BlockNoteContext.js";
import {
  BlockNoteDefaultUI,
  BlockNoteDefaultUIProps,
} from "./BlockNoteDefaultUI.js";
import {
  BlockNoteViewContext,
  useBlockNoteViewContext,
} from "./BlockNoteViewContext.js";
import { Portals, getContentComponent } from "./EditorContent.js";
import { ElementRenderer } from "./ElementRenderer.js";
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
   * Whether to render the editor element itself.
   * When `false`, you're responsible for rendering the editor yourself using the `BlockNoteViewEditor` component.
   *
   * @default true
   */
  renderEditor?: boolean;

  /**
   * Locks the editor from being editable by the user if set to `false`.
   *
   * @default true
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
    emojiPicker,
    sideMenu,
    filePanel,
    tableHandles,
    autoFocus,
    renderEditor = !editor.headless,
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

  const setElementRenderer = useCallback(
    (ref: (typeof editor)["elementRenderer"]) => {
      editor.elementRenderer = ref;
    },
    [editor]
  );

  // The BlockNoteContext makes sure the editor and some helper methods
  // are always available to nesteed compoenents
  const blockNoteContext: BlockNoteContextValue<any, any, any> = useMemo(() => {
    return {
      ...existingContext,
      editor,
      setContentEditableProps,
    };
  }, [existingContext, editor]);

  // We set defaultUIProps and editorProps on a different context, the BlockNoteViewContext.
  // This BlockNoteViewContext is used to render the editor and the default UI.
  const defaultUIProps = {
    formattingToolbar,
    linkToolbar,
    slashMenu,
    emojiPicker,
    sideMenu,
    filePanel,
    tableHandles,
  };

  const editorProps = {
    autoFocus,
    className,
    editorColorScheme,
    contentEditableProps,
    ...rest,
  };

  return (
    <BlockNoteContext.Provider value={blockNoteContext}>
      <BlockNoteViewContext.Provider
        value={{
          editorProps,
          defaultUIProps,
        }}>
        <ElementRenderer ref={setElementRenderer} />
        {renderEditor ? (
          <BlockNoteViewEditor ref={ref}>{children}</BlockNoteViewEditor>
        ) : (
          children
        )}
      </BlockNoteViewContext.Provider>
    </BlockNoteContext.Provider>
  );
}

// https://fettblog.eu/typescript-react-generic-forward-refs/
export const BlockNoteViewRaw = React.forwardRef(BlockNoteViewComponent) as <
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(
  props: BlockNoteViewProps<BSchema, ISchema, SSchema> & {
    ref?: React.ForwardedRef<HTMLDivElement>;
  }
) => ReturnType<typeof BlockNoteViewComponent<BSchema, ISchema, SSchema>>;

/**
 * Renders the editor itself and the default UI elements
 */
export const BlockNoteViewEditor = React.forwardRef(
  (props: { children: ReactNode }, ref: React.Ref<HTMLDivElement>) => {
    const ctx = useBlockNoteViewContext()!;
    const editor = useBlockNoteEditor();

    const portalManager = useMemo(() => {
      return getContentComponent();
    }, []);

    const mount = useCallback(
      (element: HTMLElement | null) => {
        if (element) {
          editor.mount(element);
        } else {
          editor.unmount();
        }
        // TODO check this
        (editor as any).contentComponent = portalManager;
      },
      [editor, portalManager]
    );

    return (
      <>
        <Portals contentComponent={portalManager} />
        <EditorElement {...ctx.editorProps} {...props} mount={mount} ref={ref}>
          {/* Renders the UI elements such as formatting toolbar, etc, unless they have been explicitly disabled  in defaultUIProps */}
          <BlockNoteDefaultUI {...ctx.defaultUIProps} />
          {/* Manually passed in children, such as customized UI elements / controllers */}
          {props.children}
        </EditorElement>
      </>
    );
  }
);

/**
 * Renders the container div + contentEditable div.
 */
const EditorElement = React.forwardRef(
  (
    props: {
      className?: string;
      editorColorScheme?: string;
      autoFocus?: boolean;
      mount: (element: HTMLElement | null) => void;
      contentEditableProps?: Record<string, any>;
      children: ReactNode;
    } & HTMLAttributes<HTMLDivElement>,
    ref: React.Ref<HTMLDivElement>
  ) => {
    const {
      className,
      editorColorScheme,
      autoFocus,
      mount,
      children,
      contentEditableProps,
      ...rest
    } = props;
    return (
      // The container wraps the contentEditable div and UI Elements such as sidebar, formatting toolbar, etc.
      <div
        className={mergeCSSClasses(
          "bn-container",
          editorColorScheme,
          className
        )}
        data-color-scheme={editorColorScheme}
        {...rest}
        ref={ref}>
        {/* The actual contentEditable that Prosemirror mounts to */}
        <div
          aria-autocomplete="list"
          aria-haspopup="listbox"
          data-bn-autofocus={autoFocus}
          ref={mount}
          {...contentEditableProps}
        />
        {/* The UI elements such as sidebar, formatting toolbar, etc. */}
        {children}
      </div>
    );
  }
);
