/**
 * Regression test for https://github.com/TypeCellOS/BlockNote/issues/2946
 *
 * Runs the `update` stream tool against a Yjs-collaborative editor, fully
 * offline (no LLM call): the tool call is fed straight into the executor.
 *
 * `AIExtension.invokeAI` forks the Y.Doc before the request starts, so the
 * fork is part of the setup here.
 */
import {
  BlockNoteEditor,
  expandPMRangeToWords,
  getBlockInfoFromNode,
  getNodeById,
} from "@blocknote/core";
import type { ForkYDocExtension } from "@blocknote/core/yjs";
import { withCollaboration, yXmlFragmentToBlocks } from "@blocknote/core/yjs";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import * as Y from "yjs";

import { AIExtension, type AIAcceptanceContext } from "../../../AIExtension.js";
import { StreamToolExecutor } from "../../../streamTool/StreamToolExecutor.js";
import { StreamTool } from "../../../streamTool/streamTool.js";
import { tools } from "./tools/index.js";

// Editors created during a test are tracked here so they can be torn down in
// `afterEach`. Without this, a mounted editor's ProseMirror view leaks async
// work that fires after Vitest disposes the jsdom environment, surfacing as an
// unhandled `ReferenceError: document is not defined`.
const mountedEditors: BlockNoteEditor<any, any, any>[] = [];

afterEach(() => {
  while (mountedEditors.length) {
    mountedEditors.pop()?._tiptapEditor.destroy();
  }
});

function createLocalEditor(
  text: string,
  onBeforeAcceptChanges?: (context: AIAcceptanceContext) => undefined,
) {
  const editor = BlockNoteEditor.create({
    initialContent: [{ type: "paragraph", content: text }],
    trailingBlock: false,
    extensions: [AIExtension({ onBeforeAcceptChanges })],
  });
  editor.mount(document.createElement("div"));
  mountedEditors.push(editor);

  return { editor, fork: () => undefined };
}

function createCollabEditor(
  text: string,
  onBeforeAcceptChanges?: (context: AIAcceptanceContext) => undefined,
) {
  const ydoc = new Y.Doc();
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment: ydoc.getXmlFragment("doc"),
        user: { color: "#ff0000", name: "Local User" },
        provider: undefined,
      },
      trailingBlock: false,
      extensions: [AIExtension({ onBeforeAcceptChanges })],
    }),
  );
  editor.mount(document.createElement("div"));
  mountedEditors.push(editor);

  editor.replaceBlocks(editor.document, [{ type: "paragraph", content: text }]);

  return {
    editor,
    ydoc,
    fork: () =>
      editor.getExtension<typeof ForkYDocExtension>("yForkDoc")?.fork(),
  };
}

/**
 * Selects the full content of the first block, mirroring what the AI menu does
 * (`buildAIRequest` -> `expandPMRangeToWords`)
 */
function selectWholeFirstBlock(editor: BlockNoteEditor<any, any, any>) {
  const id = editor.document[0].id;
  const posInfo = getNodeById(id, editor.prosemirrorState.doc)!;
  const info = getBlockInfoFromNode(posInfo.node, posInfo.posBeforeNode);
  if (!info.hasContent) {
    throw new Error("not a block container");
  }
  const from = info.content.beforePos + 1;
  const to = info.content.afterPos - 1;

  editor.transact((tr) => {
    tr.setSelection(TextSelection.create(tr.doc, from, to));
  });

  return expandPMRangeToWords(editor.prosemirrorState.doc, {
    $from: editor.prosemirrorState.doc.resolve(from),
    $to: editor.prosemirrorState.doc.resolve(to),
  });
}

async function runUpdate(
  editor: BlockNoteEditor<any, any, any>,
  id: string,
  html: string,
  selection?: { from: number; to: number },
) {
  const streamTools = [
    tools.update(editor, {
      idsSuffixed: false,
      withDelays: false,
      updateSelection: selection,
    }),
  ] as StreamTool<any>[];

  await new StreamToolExecutor(streamTools).execute(
    (async function* () {
      yield {
        operation: { type: "update" as const, id, block: html },
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
        metadata: undefined,
      };
    })(),
  );
}

describe.each([
  ["local", createLocalEditor],
  ["collaborative", createCollabEditor],
])("update tool (%s)", (_name, createEditor) => {
  it("updates a selected paragraph", async () => {
    const { editor, fork } = createEditor("Bonjour le monde");
    fork();
    const id = editor.document[0].id;
    const selection = selectWholeFirstBlock(editor);

    await runUpdate(editor, id, "<p>Bonjour à tous</p>", selection);

    editor.getExtension(AIExtension)?.acceptChanges();
    expect((editor.document[0] as any).content[0].text).toBe("Bonjour à tous");
  });

  it("updates a paragraph without a selection", async () => {
    const { editor, fork } = createEditor("Bonjour le monde");
    fork();
    const id = editor.document[0].id;

    await runUpdate(editor, id, "<p>Bonjour à tous</p>");

    editor.getExtension(AIExtension)?.acceptChanges();
    expect((editor.document[0] as any).content[0].text).toBe("Bonjour à tous");
  });
});

describe("onBeforeAcceptChanges", () => {
  it("commits marks on accepted insertion text in the same collaborative update", async () => {
    const { editor, fork, ydoc } = createCollabEditor(
      "Keep old and stay",
      ({ transform, insertedTextRanges }) => {
        expect(
          yXmlFragmentToBlocks(editor, ydoc.getXmlFragment("doc")),
        ).toMatchObject([{ content: [{ text: "Keep old and stay" }] }]);
        expect(
          insertedTextRanges.map(({ from, to }) =>
            transform.doc.textBetween(from, to),
          ),
        ).toEqual(["NEW"]);
        expect(transform.doc.textContent).toBe("Keep NEW and stay");
        expect(
          transform.doc.rangeHasMark(
            0,
            transform.doc.content.size,
            editor.pmSchema.marks.insertion,
          ),
        ).toBe(false);

        for (const { from, to } of insertedTextRanges) {
          transform.addMark(from, to, editor.pmSchema.marks.bold.create());
        }
      },
    );
    fork();
    await runUpdate(editor, editor.document[0].id, "<p>Keep NEW and stay</p>");

    const committed = vi.fn(() =>
      yXmlFragmentToBlocks(editor, ydoc.getXmlFragment("doc")),
    );
    ydoc.on("update", committed);
    editor.getExtension(AIExtension)?.acceptChanges();

    expect(committed).toHaveBeenCalledTimes(1);
    expect(committed.mock.results[0].value).toMatchObject([
      {
        content: [
          { text: "Keep ", styles: {} },
          { text: "NEW", styles: { bold: true } },
          { text: " and stay", styles: {} },
        ],
      },
    ]);
  });

  it("keeps the accepted annotation and text in one undo step", async () => {
    const { editor } = createLocalEditor(
      "Keep old and stay",
      ({ transform, insertedTextRanges }) => {
        for (const { from, to } of insertedTextRanges) {
          transform.addMark(from, to, editor.pmSchema.marks.bold.create());
        }
      },
    );
    await runUpdate(editor, editor.document[0].id, "<p>Keep NEW and stay</p>");
    editor.getExtension(AIExtension)?.acceptChanges();

    expect(editor.undo()).toBe(true);
    expect(editor.prosemirrorState.doc.textContent).toBe("Keep old and stay");
    expect(editor.redo()).toBe(true);
    expect(editor.document[0]).toMatchObject({
      content: [
        { text: "Keep ", styles: {} },
        { text: "NEW", styles: { bold: true } },
        { text: " and stay", styles: {} },
      ],
    });
  });

  it("includes changes appended by plugins when reconstructing the marked-up review", async () => {
    const beforeAccept = vi.fn<(context: AIAcceptanceContext) => undefined>(
      ({ transform, insertedTextRanges }) => {
        expect(insertedTextRanges).toHaveLength(1);
        const { from, to } = insertedTextRanges[0];
        expect(
          transform.doc.rangeHasMark(
            from,
            to,
            transform.doc.type.schema.marks.italic,
          ),
        ).toBe(true);
      },
    );
    const { editor } = createLocalEditor("Keep old and stay", beforeAccept);
    await runUpdate(editor, editor.document[0].id, "<p>Keep NEW and stay</p>");

    editor.registerExtension({
      key: "formatReview",
      prosemirrorPlugins: [
        new Plugin({
          key: new PluginKey("formatReview"),
          appendTransaction(_transactions, _oldState, { doc, schema, tr }) {
            doc.descendants((node, pos) => {
              if (node.isText && schema.marks.insertion.isInSet(node.marks)) {
                tr.addMark(
                  pos,
                  pos + node.nodeSize,
                  schema.marks.italic.create(),
                );
              }
            });
            return tr.docChanged ? tr : null;
          },
        }),
      ],
    });

    editor.getExtension(AIExtension)?.acceptChanges();

    expect(beforeAccept).toHaveBeenCalledTimes(1);
    expect(editor.document[0]).toMatchObject({
      content: [
        { text: "Keep ", styles: {} },
        { text: "NEW", styles: { italic: true } },
        { text: " and stay", styles: {} },
      ],
    });
  });

  it("reports no insertion ranges for a deletion and skips rejected reviews", async () => {
    const beforeAccept = vi.fn<(context: AIAcceptanceContext) => undefined>();
    const { editor } = createLocalEditor("Keep old and stay", beforeAccept);
    const ai = editor.getExtension(AIExtension)!;

    await runUpdate(editor, editor.document[0].id, "<p>Keep and stay</p>");
    ai.rejectChanges();
    expect(beforeAccept).not.toHaveBeenCalled();

    await runUpdate(editor, editor.document[0].id, "<p>Keep and stay</p>");
    ai.acceptChanges();
    expect(beforeAccept).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ insertedTextRanges: [] }),
    );
    expect(editor.prosemirrorState.doc.textContent).toBe("Keep and stay");
  });
});
