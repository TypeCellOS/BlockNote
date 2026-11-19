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

/** Binds headless editor cleanup to the current Node test (not a browser RPC). */
export function createSetupEditor(onFinished: TestContext["onTestFinished"]) {
  async function setupWithSchema<
    B extends BlockSchema,
    I extends InlineContentSchema,
    S extends StyleSchema,
  >(
    schema: CustomBlockNoteSchema<B, I, S>,
    options: Partial<BlockNoteEditorOptions<B, I, S>>,
  ) {
    const editor = BlockNoteEditor.create({ ...options, schema });
    onFinished(() => {
      editor.unmount();
    });
    return { editor };
  }

  /**
   * Creates a headless editor without accessing a DOM or requiring jsdom.
   * Registers the public `unmount` cleanup after the test. This does not
   * permanently destroy extensions; BlockNote has no public destroy method.
   *
   * Use for Node tests of editor/document logic. Use browser setupEditor for
   * component rendering and real input/focus behavior.
   * Accepts the same top-level editor options as the browser setupEditor,
   * including custom schemas, but no view props, skin, children, or rerender.
   * Returns only `{ editor }`; there is no mounting container.
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
  ): Promise<{ editor: BlockNoteEditor<B, I, S> }>;
  function setupEditor(options?: DefaultOptions): Promise<{
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
