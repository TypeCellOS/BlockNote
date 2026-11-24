import { describe, expect } from "vite-plus/test";

import { copyToClipboard } from "../copyToClipboard.js";
import { testEditorOptions } from "../../support/reactTestEditorOptions.js";
import { copyTestInstancesHTML } from "../copy/customBlockCopyTestInstances.js";
import { copyPasteEqualityTestInstances } from "./customBlockCopyPasteEqualityTestInstances.js";

describe("React copy/paste equality tests", () => {
  for (const { testCase, executeTest } of copyPasteEqualityTestInstances) {
    it(`${testCase.name}`, async ({ setupEditor }) => {
      const { editor } = await setupEditor(testEditorOptions);
      await executeTest(editor, testCase);
    });
  }

  it("pastes inline math from the BlockNote MIME payload into a different editor", async ({
    setupEditor,
  }) => {
    const math = copyTestInstancesHTML.find(
      ({ testCase }) => testCase.name === "math",
    );
    if (!math) {
      throw new Error("Missing the inline math copy fixture");
    }
    const { editor: source } = await setupEditor({
      ...testEditorOptions,
      initialContent: math.testCase.document,
    });
    source.transact((tr) =>
      tr.setSelection(math.testCase.getCopySelection(tr.doc)),
    );
    const { clipboardHTML } = copyToClipboard(source);

    const { editor: destination } = await setupEditor({
      ...testEditorOptions,
      initialContent: [{ id: "destination", type: "paragraph" }],
    });
    destination.setTextCursorPosition("destination", "start");

    const clipboard = new DataTransfer();
    clipboard.setData("text/html", "<p>Unrelated HTML</p>");
    clipboard.setData("text/plain", "**Unrelated Markdown**");
    clipboard.setData("blocknote/html", clipboardHTML);
    const event = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "clipboardData", { value: clipboard });
    destination.domElement!.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(
      destination.document.map(({ type, content }) => ({ type, content })),
    ).toEqual([{ type: "paragraph", content: source.document[0].content }]);
  });
});
