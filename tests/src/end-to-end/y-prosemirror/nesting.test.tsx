/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for nesting-related suggestions: indent,
 * unindent, and type-change on a block that already has children.
 * Same shape as `propChanges.test.tsx`.
 *
 * The third test (`change parent type with children`) is marked
 * `test.fails` because it hits the same known y-prosemirror
 * `deltaToPSteps` bug that affects all type-changes-in-suggestion-mode
 * (see `typeChanges.test.tsx`).
 */
import { SuggestionsExtension } from "@blocknote/core/y";
import { expect, test } from "vite-plus/test";
import { expectScreenshot, expectVisible } from "./fixtures/browserExpect.js";

import {
  editorHtml,
  setupSuggestionTest,
  ydocXml,
} from "./fixtures/suggestionFixture.js";

// Indent: take two sibling paragraphs and nest the second under the
// first.
test("suggestion mode: indent a block", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "indent N1" });

  editor.replaceBlocks(editor.document, [
    { id: "n0", type: "paragraph", content: "N0" },
    { id: "n1", type: "paragraph", content: "N1" },
  ]);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("N0"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  // Place cursor in N1 and ask BlockNote to nest it under N0.
  editor.setTextCursorPosition("n1", "start");
  editor.nestBlock();

  await expect.poll(() => editor.document[0]?.children.length).toBe(1);

  await expectScreenshot(screen.getByTestId("editor-root"), "nesting-indent");

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="n0">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N0</paragraph>
      </blockContainer>
      <blockContainer id="n1">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N1</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="n0">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N0</paragraph>
        <blockGroup>
          <blockContainer id="n1">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">N1</paragraph>
          </blockContainer>
        </blockGroup>
      </blockContainer>
    </blockGroup>"
  `);
  // Structural move encoded as insert-at-new-location + node-level
  // delete on the old location. The original N1 sibling at the bottom
  // is wrapped in `<y-attributed-delete>` (block-level mark) and the
  // new nested copy is wrapped in `<y-attributed-insert>` at several
  // levels. So accept/reject UI does have the data to render this
  // sensibly – the snapshot below is the source of truth.
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="n0">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">N0</paragraph>
          <y-attributed-insert userIds="" user-color="#30bced">
            <blockGroup>
              <y-attributed-insert userIds="" user-color="#30bced">
                <blockContainer id="n1">
                  <y-attributed-insert userIds="" user-color="#30bced">
                    <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                      <y-attributed-insert userIds="" user-color="#30bced">N1</y-attributed-insert>
                    </paragraph>
                  </y-attributed-insert>
                </blockContainer>
              </y-attributed-insert>
            </blockGroup>
          </y-attributed-insert>
        </blockContainer>
        <y-attributed-delete userIds="" user-color="#30bced">
          <blockContainer id="n1">
            <paragraph backgroundColor="default" textColor="default" textAlignment="left">N1</paragraph>
          </blockContainer>
        </y-attributed-delete>
      </blockGroup>
    </doc>"
  `);
});

// Unindent: nested child becomes a sibling of its parent.
test("suggestion mode: unindent a block", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "unindent N1" });

  editor.replaceBlocks(editor.document, [
    {
      id: "n0",
      type: "paragraph",
      content: "N0",
      children: [{ id: "n1", type: "paragraph", content: "N1" }],
    },
  ]);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("N0"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.setTextCursorPosition("n1", "start");
  editor.unnestBlock();

  await expect.poll(() => editor.document.length).toBe(2);

  await expectScreenshot(screen.getByTestId("editor-root"), "nesting-unindent");

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="n0">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N0</paragraph>
        <blockGroup>
          <blockContainer id="n1">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">N1</paragraph>
          </blockContainer>
        </blockGroup>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="n0">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N0</paragraph>
      </blockContainer>
      <blockContainer id="n1">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N1</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="n0">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">N0</paragraph>
          <y-attributed-delete userIds="" user-color="#30bced">
            <blockGroup>
              <blockContainer id="n1">
                <paragraph backgroundColor="default" textColor="default" textAlignment="left">N1</paragraph>
              </blockContainer>
            </blockGroup>
          </y-attributed-delete>
        </blockContainer>
        <y-attributed-insert userIds="" user-color="#30bced">
          <blockContainer id="n1">
            <y-attributed-insert userIds="" user-color="#30bced">
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                <y-attributed-insert userIds="" user-color="#30bced">N1</y-attributed-insert>
              </paragraph>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});

// Change parent block's type while keeping its children. Hits the
// known y-prosemirror type-change bug.
test.fails("suggestion mode: change block type of a block with children", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "parent → heading" });

  editor.replaceBlocks(editor.document, [
    {
      id: "n0",
      type: "paragraph",
      content: "N0",
      children: [{ id: "n1", type: "paragraph", content: "N1" }],
    },
  ]);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("N0"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  const [parent] = editor.document;
  editor.updateBlock(parent, { type: "heading", props: { level: 1 } });

  await expect.poll(() => editor.document[0]?.type).toBe("heading");

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "nesting-change-parent-type",
  );

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot();
  expect(editorHtml(editor)).toMatchInlineSnapshot();
});
