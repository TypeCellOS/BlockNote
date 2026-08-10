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
  getBlockInfo,
  getNodeById,
} from "@blocknote/core";
import type { ForkYDocExtension } from "@blocknote/core/yjs";
import { withCollaboration } from "@blocknote/core/yjs";
import { TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vite-plus/test";
import * as Y from "yjs";

import { AIExtension } from "../../../AIExtension.js";
import { StreamToolExecutor } from "../../../streamTool/StreamToolExecutor.js";
import { StreamTool } from "../../../streamTool/streamTool.js";
import { tools } from "./tools/index.js";

function createLocalEditor(text: string) {
  const editor = BlockNoteEditor.create({
    initialContent: [{ type: "paragraph", content: text }],
    trailingBlock: false,
    extensions: [AIExtension()],
  });
  editor.mount(document.createElement("div"));

  return { editor, fork: () => undefined };
}

function createCollabEditor(text: string) {
  const ydoc = new Y.Doc();
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment: ydoc.getXmlFragment("doc"),
        user: { color: "#ff0000", name: "Local User" },
        provider: undefined,
      },
      trailingBlock: false,
      extensions: [AIExtension()],
    }),
  );
  editor.mount(document.createElement("div"));

  editor.replaceBlocks(editor.document, [{ type: "paragraph", content: text }]);

  return {
    editor,
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
  const info = getBlockInfo(getNodeById(id, editor.prosemirrorState.doc)!);
  if (!info.isBlockContainer) {
    throw new Error("not a block container");
  }
  const from = info.blockContent.beforePos + 1;
  const to = info.blockContent.afterPos - 1;

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
