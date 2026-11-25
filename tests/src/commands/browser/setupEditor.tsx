import {
  BlockNoteEditor,
  type BlockNoteEditorOptions,
  BlockNoteSchema,
  type BlockSchema,
  type CustomBlockNoteSchema,
  type DefaultBlockSchema,
  type DefaultInlineContentSchema,
  type DefaultStyleSchema,
  type InlineContentSchema,
  type StyleSchema,
} from "@blocknote/core";
import type { BlockNoteViewRaw } from "@blocknote/react";
import type { ComponentProps, ReactNode } from "react";
import type { TestContext } from "vite-plus/test";
import { acquireTiptapFixtureStyles } from "./tiptapFixtureStyles.js";

type ViewProps<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = Omit<ComponentProps<typeof BlockNoteViewRaw<B, I, S>>, "editor">;

type EditorSkin = "mantine" | "shadcn" | "ariakit" | "raw";

type RenderOptions<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = Partial<BlockNoteEditorOptions<B, I, S>> & {
  mountType?: "react";
  skin?: EditorSkin;
  props?: Omit<ViewProps<B, I, S>, "children">;
  children?:
    | ReactNode
    | ((props: { editor: BlockNoteEditor<B, I, S> }) => ReactNode);
  outside?: (props: {
    editor: BlockNoteEditor<B, I, S>;
    children: ReactNode;
  }) => ReactNode;
};

type DefaultRenderOptions = Omit<
  RenderOptions<
    DefaultBlockSchema,
    DefaultInlineContentSchema,
    DefaultStyleSchema
  >,
  "schema"
> & { schema?: never };

type CoreOptions<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = Partial<BlockNoteEditorOptions<B, I, S>> & {
  mountType: false | "dom";
  skin?: never;
  props?: never;
  children?: never;
  outside?: never;
};

type DefaultCoreOptions = Omit<
  CoreOptions<
    DefaultBlockSchema,
    DefaultInlineContentSchema,
    DefaultStyleSchema
  >,
  "schema"
> & { schema?: never };

function prepareDOMMount() {
  const styles = acquireTiptapFixtureStyles(document);
  let host: HTMLElement | undefined;
  return {
    mount(mountEditor: (host: HTMLElement) => void) {
      const element = document.createElement("div");
      host = element;
      document.body.append(element);
      styles.track(() => mountEditor(element));
    },
    dispose(destroyEditor: () => void) {
      styles.dispose(() => {
        try {
          destroyEditor();
        } finally {
          host?.remove();
        }
      });
    },
  };
}

// A named result keeps editor hovers from recursively expanding the factory's
// inferred ReturnType through the generic setupEditor overloads (TS 6).
type RenderedEditor<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = {
  editor: BlockNoteEditor<B, I, S>;
  rootNode: HTMLDivElement;
  rerender: (props: ViewProps<B, I, S>) => void;
};

/** Binds {@link SetupEditor | setupEditor} cleanup to the current test; consumed by its fixture. */
export function createSetupEditor(onFinished: TestContext["onTestFinished"]) {
  async function renderWithSchema<
    B extends BlockSchema,
    I extends InlineContentSchema,
    S extends StyleSchema,
  >(schema: CustomBlockNoteSchema<B, I, S>, options: RenderOptions<B, I, S>) {
    const {
      mountType: _,
      skin = "mantine",
      props: viewProps,
      children,
      outside,
      ...editorOptions
    } = options;
    // Keep skin modules and their CSS out of tests that never render an editor.
    const [{ BlockNoteView }, { StrictMode }, { flushSync }, { createRoot }] =
      await Promise.all([
        loadSkin(skin),
        import("react"),
        import("react-dom"),
        import("react-dom/client"),
      ]);
    let rootNode: HTMLDivElement | undefined;
    let root: ReturnType<typeof createRoot> | undefined;
    let destroyEditor: (() => void) | undefined;
    const styles = acquireTiptapFixtureStyles(document);
    function dispose() {
      styles.dispose(() => {
        try {
          root?.unmount();
        } finally {
          try {
            destroyEditor?.();
          } finally {
            rootNode?.remove();
          }
        }
      });
    }
    onFinished(dispose);

    try {
      const editor = BlockNoteEditor.create({ ...editorOptions, schema });
      destroyEditor = () => editor._tiptapEditor.destroy();
      const container = document.createElement("div");
      rootNode = container;
      document.body.append(container);
      const view = createRoot(container);
      root = view;

      let props = {
        ...viewProps,
        children:
          typeof children === "function" ? children({ editor }) : children,
      };
      function rerender(nextProps: ViewProps<B, I, S>) {
        props = { ...props, ...nextProps };
        styles.track(() =>
          flushSync(() => {
            const children = <BlockNoteView editor={editor} {...props} />;
            view.render(
              <StrictMode>
                {outside ? outside({ editor, children }) : children}
              </StrictMode>,
            );
          }),
        );
      }
      rerender(props);
      await document.fonts.ready;
      return { editor, rootNode: container, rerender };
    } catch (error) {
      dispose();
      throw error;
    }
  }

  /**
   * Creates an editor with automatic cleanup after the test. By default
   * (`mountType: "react"`), renders its view in React StrictMode. Pass
   * `mountType: "dom"` to mount directly in the DOM without React, or
   * `mountType: false` to use browser APIs without mounting. Both return
   * only `{ editor }`.
   * If you mount a headless fixture yourself, unmount any manually created
   * React root before the fixture destroys the editor.
   *
   * Lazily loads the selected `skin` ("mantine" by default, "shadcn", or
   * "ariakit") and its styles only when called. Use "raw" for React editor
   * context without a skin or its CSS. Styles from other renders are not unloaded.
   *
   * Accepts editor options (including a custom schema) at the top level, `props`
   * for the view, `children` inside it, and `outside` to wrap the view or add sibling
   * UI. Children may be a callback receiving the editor. Returns `{ editor,
   * rootNode, rerender }`; `rootNode` is the React mounting container, including
   * any `outside` wrapper. It is removed during cleanup.
   * {@link RenderedEditor.rerender | rerender} merges view props without replacing
   * the editor or rootNode.
   *
   * The initial render is committed and document fonts are ready before resolving.
   * It does not focus the editor or wait for later selection-driven UI: perform
   * the relevant action and assert that UI is ready in the test.
   *
   * @example
   * it("updates when editability changes", async ({ setupEditor }) => {
   *   const { editor, rerender } = await setupEditor({
   *     initialContent: [{ type: "paragraph", content: "Selected text" }],
   *     props: { formattingToolbar: false },
   *     children: <BasicTextStyleButton basicTextStyle="bold" />,
   *   });
   *   rerender({ editable: false });
   *   expect(editor.isEditable).toBe(false);
   * });
   *
   * @example
   * const { editor } = await setupEditor({
   *   skin: "ariakit",
   *   schema: customSchema,
   *   outside: ({ children }) => <section>{children}<button>After editor</button></section>,
   * });
   */
  function setupEditor<
    B extends BlockSchema,
    I extends InlineContentSchema,
    S extends StyleSchema,
  >(
    options: CoreOptions<B, I, S> & {
      schema: CustomBlockNoteSchema<B, I, S>;
    },
  ): Promise<{ editor: BlockNoteEditor<B, I, S> }>;
  function setupEditor(options: DefaultCoreOptions): Promise<{
    editor: BlockNoteEditor<
      DefaultBlockSchema,
      DefaultInlineContentSchema,
      DefaultStyleSchema
    >;
  }>;
  function setupEditor<
    B extends BlockSchema,
    I extends InlineContentSchema,
    S extends StyleSchema,
  >(
    options: RenderOptions<B, I, S> & {
      schema: CustomBlockNoteSchema<B, I, S>;
    },
  ): Promise<RenderedEditor<B, I, S>>;
  function setupEditor(
    options?: DefaultRenderOptions,
  ): Promise<
    RenderedEditor<
      DefaultBlockSchema,
      DefaultInlineContentSchema,
      DefaultStyleSchema
    >
  >;
  async function setupEditor<
    B extends BlockSchema,
    I extends InlineContentSchema,
    S extends StyleSchema,
  >(
    options:
      | (RenderOptions<B, I, S> & { schema: CustomBlockNoteSchema<B, I, S> })
      | (CoreOptions<B, I, S> & { schema: CustomBlockNoteSchema<B, I, S> })
      | DefaultRenderOptions
      | DefaultCoreOptions = {},
  ) {
    if (options.mountType === undefined || options.mountType === "react") {
      if (options.schema === undefined) {
        return renderWithSchema(BlockNoteSchema.create(), options);
      }
      return renderWithSchema(options.schema, options);
    } else {
      const { mountType, ...editorOptions } = options;
      const { createSetupEditor } = await import("../node/setupEditor.js");
      const setupCore = createSetupEditor(
        onFinished,
        mountType === "dom" ? prepareDOMMount : undefined,
      );
      if (editorOptions.schema === undefined) {
        return setupCore(editorOptions);
      }
      return setupCore({ ...editorOptions, schema: editorOptions.schema });
    }
  }
  return setupEditor;
}

export type SetupEditor = ReturnType<typeof createSetupEditor>;

async function loadSkin(skin: EditorSkin) {
  switch (skin) {
    case "raw": {
      const { BlockNoteViewRaw } = await import("@blocknote/react");
      return { BlockNoteView: BlockNoteViewRaw };
    }
    case "mantine": {
      return (
        await Promise.all([
          import("@blocknote/mantine"),
          import("@blocknote/mantine/style.css"),
        ])
      )[0];
    }
    case "shadcn":
      return import("@blocknote/shadcn");
    case "ariakit":
      return import("@blocknote/ariakit");
  }
}
