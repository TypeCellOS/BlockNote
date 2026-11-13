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
  getNodeById,
} from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { TextSelection } from "@tiptap/pm/state";
import "../../../packages/mantine/src/style.css";
import type { ComponentProps, ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { test as base, type TestContext } from "vite-plus/test";

type ViewProps<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = Omit<ComponentProps<typeof BlockNoteView<B, I, S>>, "editor">;

type RenderOptions<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = Partial<BlockNoteEditorOptions<B, I, S>> & {
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
// inferred ReturnType through the generic renderEditor overloads (TS 6).
type RenderedEditor<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = {
  editor: BlockNoteEditor<B, I, S>;
  rerender: (props: ViewProps<B, I, S>) => void;
};

function createRenderEditor(onFinished: TestContext["onTestFinished"]) {
  async function renderWithSchema<
    B extends BlockSchema,
    I extends InlineContentSchema,
    S extends StyleSchema,
  >(schema: CustomBlockNoteSchema<B, I, S>, options: RenderOptions<B, I, S>) {
    const { props: viewProps, children, outside, ...editorOptions } = options;
    const editor = BlockNoteEditor.create({
      ...editorOptions,
      schema,
    });
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    onFinished(() => {
      root.unmount();
      editor._tiptapEditor.destroy();
      host.remove();
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
        root.render(outside ? outside({ editor, children }) : children);
      });
    }
    rerender(props);
    await document.fonts.ready;
    return { editor, rerender };
  }

  function renderEditor<
    B extends BlockSchema,
    I extends InlineContentSchema,
    S extends StyleSchema,
  >(
    options: RenderOptions<B, I, S> & {
      schema: CustomBlockNoteSchema<B, I, S>;
    },
  ): Promise<RenderedEditor<B, I, S>>;
  function renderEditor(
    options?: DefaultRenderOptions,
  ): Promise<
    RenderedEditor<
      DefaultBlockSchema,
      DefaultInlineContentSchema,
      DefaultStyleSchema
    >
  >;
  function renderEditor<
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
  return renderEditor;
}

export type RenderEditor = ReturnType<typeof createRenderEditor>;

/** Selects the first substring, ignoring marks but never crossing non-text nodes. */
export function selectText(
  editor: Pick<BlockNoteEditor, "transact">,
  substring: string,
  range?: { startBlockId: string; endBlockId?: string },
) {
  if (substring.length === 0) {
    throw new Error("selectText requires a non-empty substring");
  }
  editor.transact((tr) => {
    let from = 0;
    let to = tr.doc.content.size;
    if (range) {
      const start = getNodeById(range.startBlockId, tr.doc);
      const end = getNodeById(range.endBlockId ?? range.startBlockId, tr.doc);
      if (!start || !end) {
        throw new Error("selectText could not find the requested block range");
      }
      from = start.posBeforeNode;
      to = end.posBeforeNode + end.node.nodeSize;
      if (from >= to) {
        throw new Error("selectText requires blocks in document order");
      }
    }

    let text = "";
    let textStart = 0;
    let match: { from: number; to: number } | undefined;
    tr.doc.nodesBetween(from, to, (node, pos) => {
      if (match) {
        return false;
      }
      if (!node.isText) {
        if (node.isBlock || node.isLeaf) {
          text = "";
        }
        return true;
      }
      // Adjacent text nodes can have different marks. Gaps indicate a hard
      // break, another inline node, or a new block, and must reset the search.
      if (pos !== textStart + text.length) {
        text = "";
        textStart = pos;
      }
      text += node.textContent;
      const index = text.indexOf(substring);
      if (index !== -1) {
        match = {
          from: textStart + index,
          to: textStart + index + substring.length,
        };
      }
      return true;
    });
    if (!match) {
      throw new Error(`selectText could not find ${JSON.stringify(substring)}`);
    }
    tr.setSelection(TextSelection.create(tr.doc, match.from, match.to));
  });
}

export const test = base.extend<{
  renderEditor: RenderEditor;
  selectText: typeof selectText;
}>({
  renderEditor: async ({ onTestFinished }, use) => {
    await use(createRenderEditor(onTestFinished));
  },
  // Vitest requires destructured fixture arguments, even without dependencies.
  // eslint-disable-next-line no-empty-pattern
  selectText: async ({}, use) => {
    await use(selectText);
  },
});

// The browser setup installs this extended API; imported Vitest APIs are not
// extended. tests/tsconfig.browser.json includes the setup for colocated tests.
declare global {
  var it: typeof test;
}
