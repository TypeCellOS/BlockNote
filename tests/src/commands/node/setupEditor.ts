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

type EditorMount = {
  mount: (mountEditor: (host: HTMLElement) => void) => void;
  dispose: (destroyEditor: () => void) => void;
};

/** Binds Core editor cleanup to the current test; headless by default. */
export function createSetupEditor(
  onFinished: (cleanup: () => void) => void,
  prepareMount?: () => EditorMount,
) {
  async function setupWithSchema<
    B extends BlockSchema,
    I extends InlineContentSchema,
    S extends StyleSchema,
  >(
    schema: CustomBlockNoteSchema<B, I, S>,
    options: Partial<BlockNoteEditorOptions<B, I, S>>,
  ) {
    let mountResources: EditorMount | undefined;
    let editor: BlockNoteEditor<B, I, S> | undefined;
    let disposed = false;
    function dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      function destroyEditor() {
        editor?._tiptapEditor.destroy();
      }
      if (mountResources) {
        mountResources.dispose(destroyEditor);
      } else {
        destroyEditor();
      }
    }

    onFinished(dispose);
    try {
      mountResources = prepareMount?.();
      editor = BlockNoteEditor.create({ ...options, schema });
      mountResources?.mount(editor.mount);
      return { editor };
    } catch (error) {
      dispose();
      throw error;
    }
  }

  /**
   * Creates a Core editor, headless unless the fixture provides a mount host.
   * Destroys the editor only during final cleanup, via TipTap because BlockNote
   * has no public destroy method. Public `unmount` remains safe for remounting.
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
