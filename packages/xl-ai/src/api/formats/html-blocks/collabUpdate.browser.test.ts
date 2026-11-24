/**
 * Regression test for https://github.com/TypeCellOS/BlockNote/issues/2946
 *
 * Runs the `update` stream tool against a Yjs-collaborative editor, fully
 * offline (no LLM call): the tool call is fed straight into the executor.
 *
 * `AIExtension.invokeAI` forks the Y.Doc before the request starts, so the
 * fork is part of the setup here.
 */
import type { BlockNoteEditor } from "@blocknote/core";
import type { ForkYDocExtension } from "@blocknote/core/yjs";
import { withCollaboration } from "@blocknote/core/yjs";
import { describe, expect, type TestContext } from "vite-plus/test";
import * as Y from "yjs";

import type { BrowserContext } from "../../../../../../tests/src/fixtures/editor.js";
import { AIExtension } from "../../../AIExtension.js";
import { StreamToolExecutor } from "../../../streamTool/StreamToolExecutor.js";
import { StreamTool } from "../../../streamTool/streamTool.js";
import { tools } from "./tools/index.js";

async function createLocalEditor(
  text: string,
  setupEditor: BrowserContext["setupEditor"],
) {
  const { editor } = await setupEditor({
    mountType: "dom",
    initialContent: [{ type: "paragraph", content: text }],
    trailingBlock: false,
    extensions: [AIExtension()],
  });
  return { editor, fork: () => undefined };
}

async function createCollabEditor(
  text: string,
  setupEditor: BrowserContext["setupEditor"],
  onTestFinished: TestContext["onTestFinished"],
) {
  const ydoc = new Y.Doc();
  // Finish hooks run in reverse order, so the editor unmounts before the doc.
  onTestFinished(() => ydoc.destroy());
  const { editor } = await setupEditor({
    mountType: "dom",
    ...withCollaboration({
      collaboration: {
        fragment: ydoc.getXmlFragment("doc"),
        user: { color: "#ff0000", name: "Local User" },
        provider: undefined,
      },
      trailingBlock: false,
      extensions: [AIExtension()],
    }),
  });
  editor.replaceBlocks(editor.document, [{ type: "paragraph", content: text }]);

  return {
    editor,
    fork: () =>
      editor.getExtension<typeof ForkYDocExtension>("yForkDoc")?.fork(),
  };
}

async function runUpdate(
  editor: BlockNoteEditor,
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
  it("updates a selected paragraph", async ({
    setupEditor,
    onTestFinished,
    selectText,
  }) => {
    const { editor, fork } = await createEditor(
      "Bonjour le monde",
      setupEditor,
      onTestFinished,
    );
    fork();
    const id = editor.document[0].id;
    const { from, to } = selectText(editor, "Bonjour le monde").selection;

    await runUpdate(editor, id, "<p>Bonjour à tous</p>", { from, to });

    editor.getExtension(AIExtension)?.acceptChanges();
    expect(editor.getBlock(id)?.content).toMatchObject([
      { type: "text", text: "Bonjour à tous" },
    ]);
  });

  it("updates a paragraph without a selection", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { editor, fork } = await createEditor(
      "Bonjour le monde",
      setupEditor,
      onTestFinished,
    );
    fork();
    const id = editor.document[0].id;

    await runUpdate(editor, id, "<p>Bonjour à tous</p>");

    editor.getExtension(AIExtension)?.acceptChanges();
    expect(editor.getBlock(id)?.content).toMatchObject([
      { type: "text", text: "Bonjour à tous" },
    ]);
  });
});
