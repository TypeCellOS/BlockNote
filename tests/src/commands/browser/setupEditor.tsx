import React from "react";
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
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { TestContext } from "vite-plus/test";

type ViewProps<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = Omit<ComponentProps<typeof BlockNoteViewRaw<B, I, S>>, "editor">;

type RenderOptions<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = Partial<BlockNoteEditorOptions<B, I, S>> & {
  skin?: "mantine" | "shadcn" | "ariakit";
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
      skin = "mantine",
      props: viewProps,
      children,
      outside,
      ...editorOptions
    } = options;
    // Keep skin modules and their CSS out of tests that never render an editor.
    const { BlockNoteView } = await loadSkin(skin);
    const editor = BlockNoteEditor.create({
      ...editorOptions,
      schema,
    });
    const rootNode = document.createElement("div");
    document.body.append(rootNode);
    const root = createRoot(rootNode);
    onFinished(() => {
      root.unmount();
      editor._tiptapEditor.destroy();
      rootNode.remove();
    });

    let props = {
      ...viewProps,
      children:
        typeof children === "function" ? children({ editor }) : children,
    };
    function rerender(nextProps: ViewProps<B, I, S>) {
      props = { ...props, ...nextProps };
      flushSync(() => {
        const children = <BlockNoteView editor={editor} {...props} />;
        root.render(
          <React.StrictMode>
            {outside ? outside({ editor, children }) : children}
          </React.StrictMode>,
        );
      });
    }
    rerender(props);
    await document.fonts.ready;
    return { editor, rootNode, rerender };
  }

  /**
   * Creates a real editor and mounts its view in React StrictMode, with
   * automatic unmount/editor destruction after the test. Use for browser component
   * tests that need editor context or real document changes. For logic that does
   * not need browser rendering, the Node fixture provides the same setupEditor
   * API with editor options only, mounting the core editor in jsdom. Use
   * BlockNoteEditor.create directly when a headless editor is sufficient.
   *
   * Lazily loads the selected `skin` ("mantine" by default, "shadcn", or
   * "ariakit") and its styles only when called. Use one skin per test file:
   * styles from a previously loaded skin are not unloaded.
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
  function setupEditor<
    B extends BlockSchema,
    I extends InlineContentSchema,
    S extends StyleSchema,
  >(
    options:
      | (RenderOptions<B, I, S> & { schema: CustomBlockNoteSchema<B, I, S> })
      | DefaultRenderOptions = {},
  ) {
    if (options.schema === undefined) {
      return renderWithSchema(BlockNoteSchema.create(), options);
    }
    return renderWithSchema(options.schema, options);
  }
  return setupEditor;
}

export type SetupEditor = ReturnType<typeof createSetupEditor>;

async function loadSkin(skin: "mantine" | "shadcn" | "ariakit") {
  switch (skin) {
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
