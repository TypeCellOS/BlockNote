import {
  BlockNoteEditor,
  BlockNoteSchema,
  type BlockNoteEditorOptions,
  type BlockSchema,
  type CustomBlockNoteSchema,
  type DefaultBlockSchema,
  type DefaultInlineContentSchema,
  type DefaultStyleSchema,
  type InlineContentSchema,
  type StyleSchema,
} from "@blocknote/core";
import type { TestContext } from "vite-plus/test";

type DefaultOptions = Omit<
  Partial<
    BlockNoteEditorOptions<
      DefaultBlockSchema,
      DefaultInlineContentSchema,
      DefaultStyleSchema
    >
  >,
  "schema"
> & { schema?: never };

/** Binds mounted editor cleanup to the current Node test (not a browser RPC). */
export function createSetupEditor(onFinished: TestContext["onTestFinished"]) {
  async function setupWithSchema<
    B extends BlockSchema,
    I extends InlineContentSchema,
    S extends StyleSchema,
  >(
    schema: CustomBlockNoteSchema<B, I, S>,
    options: Partial<BlockNoteEditorOptions<B, I, S>>,
  ) {
    const rootNode = document.createElement("div");
    const editor = BlockNoteEditor.create({ ...options, schema });
    document.body.append(rootNode);
    onFinished(() => {
      editor.unmount();
      rootNode.remove();
    });
    editor.mount(rootNode);
    return { editor, rootNode };
  }

  /**
   * Creates a real editor, mounts its contenteditable into the test environment's
   * jsdom document, and unmounts/removes it after the test. Requires Vitest's
   * `jsdom` environment; it does not install DOM globals itself.
   *
   * Use for Node tests of editor/document logic. This mounts the core editor, not
   * a React view or skin. Use browser setupEditor for component rendering and real
   * input/focus behavior, or BlockNoteEditor.create directly for headless logic.
   * Accepts the same top-level editor options as the browser setupEditor,
   * including custom schemas, but no view props, skin, children, or rerender.
   * Returns `{ editor, rootNode }`, where `rootNode` is the mounting container
   * attached to document.body and removed during cleanup.
   *
   * @example
   *
   * it("updates a block", async ({ setupEditor }) => {
   *   const { editor } = await setupEditor({
   *     initialContent: [{ id: "text", type: "paragraph", content: "Hello" }],
   *   });
   *   editor.updateBlock("text", { props: { textAlignment: "center" } });
   *   expect(editor.getBlock("text")?.props.textAlignment).toBe("center");
   * });
   */
  function setupEditor<
    B extends BlockSchema,
    I extends InlineContentSchema,
    S extends StyleSchema,
  >(
    options: Partial<BlockNoteEditorOptions<B, I, S>> & {
      schema: CustomBlockNoteSchema<B, I, S>;
    },
  ): Promise<{ editor: BlockNoteEditor<B, I, S>; rootNode: HTMLDivElement }>;
  function setupEditor(options?: DefaultOptions): Promise<{
    editor: BlockNoteEditor<
      DefaultBlockSchema,
      DefaultInlineContentSchema,
      DefaultStyleSchema
    >;
    rootNode: HTMLDivElement;
  }>;
  function setupEditor<
    B extends BlockSchema,
    I extends InlineContentSchema,
    S extends StyleSchema,
  >(
    options:
      | (Partial<BlockNoteEditorOptions<B, I, S>> & {
          schema: CustomBlockNoteSchema<B, I, S>;
        })
      | DefaultOptions = {},
  ) {
    if (options.schema === undefined) {
      return setupWithSchema(BlockNoteSchema.create(), options);
    }
    return setupWithSchema(options.schema, options);
  }
  return setupEditor;
}

export type SetupEditor = ReturnType<typeof createSetupEditor>;
