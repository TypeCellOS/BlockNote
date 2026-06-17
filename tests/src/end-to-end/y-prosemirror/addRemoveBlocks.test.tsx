/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for add/remove block suggestions:
 * inserting and deleting whole blocks (not just editing their text /
 * props). Same shape as the other categories.
 */
import { SuggestionsExtension } from "@blocknote/core/y";
import { expect, test } from "vite-plus/test";
import { expectScreenshot, expectVisible } from "./fixtures/browserExpect.js";

import {
  editorHtml,
  setupSuggestionTest,
  waitForSuggestion,
  ydocXml,
} from "./fixtures/suggestionFixture.js";

// Inline SVG data URL – avoids a network fetch for the image src.
const IMG_SRC =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23ff6b6b'/></svg>";

// Empty doc gets a heading inserted at the top.
test("suggestion mode: add heading to empty doc", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "add heading at top" });

  editor.replaceBlocks(editor.document, []);
  await sync();

  // See note in "add paragraph after existing block" – snapshot the
  // clean base before suggestions mutate the bound `baseDoc`.
  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.replaceBlocks(editor.document, [
    { id: "h0", type: "heading", props: { level: 1 }, content: "New heading" },
  ]);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "add-remove-add-heading-to-empty",
  );

  expect(baseDocXml).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="1">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default"></paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="h0">
        <heading
          backgroundColor="default"
          isToggleable="false"
          level="1"
          textAlignment="left"
          textColor="default"
        >New heading</heading>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <y-attributed-delete userIds="" user-color="#30bced">
          <blockContainer id="1">
            <paragraph backgroundColor="default" textColor="default" textAlignment="left"></paragraph>
          </blockContainer>
        </y-attributed-delete>
        <y-attributed-insert userIds="" user-color="#30bced">
          <blockContainer id="h0">
            <y-attributed-insert userIds="" user-color="#30bced">
              <heading
                backgroundColor="default"
                textColor="default"
                textAlignment="left"
                level="1"
                isToggleable="false"
              >
                <y-attributed-insert userIds="" user-color="#30bced">New heading</y-attributed-insert>
              </heading>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});

// Add a paragraph after an existing heading.
test("suggestion mode: add paragraph after existing block", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "append paragraph" });

  editor.replaceBlocks(editor.document, [
    { id: "h0", type: "heading", props: { level: 1 }, content: "Title" },
  ]);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("Title"));

  // Capture the base document *before* enabling suggestions: `baseDoc`
  // is the live fragment editor A is bound to, so suggestion-mode edits
  // flush attribution marks back into it. Reading it after the edit is
  // racy; snapshot the clean pre-suggestion state here instead.
  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.insertBlocks(
    [{ id: "p0", type: "paragraph", content: "Body text" }],
    "h0",
    "after",
  );

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "add-remove-add-paragraph",
  );

  expect(baseDocXml).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="h0">
        <heading
          backgroundColor="default"
          isToggleable="false"
          level="1"
          textAlignment="left"
          textColor="default"
        >Title</heading>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="h0">
        <heading
          backgroundColor="default"
          isToggleable="false"
          level="1"
          textAlignment="left"
          textColor="default"
        >Title</heading>
      </blockContainer>
      <blockContainer id="p0">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Body text</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="h0">
          <heading
            backgroundColor="default"
            textColor="default"
            textAlignment="left"
            level="1"
            isToggleable="false"
          >Title</heading>
        </blockContainer>
        <y-attributed-insert userIds="" user-color="#30bced">
          <blockContainer id="p0">
            <y-attributed-insert userIds="" user-color="#30bced">
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                <y-attributed-insert userIds="" user-color="#30bced">Body text</y-attributed-insert>
              </paragraph>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});

// TODO: block-level deletions DO carry a node-level
// `<y-attributed-delete>` mark in the PM doc (visible in the snapshots
// below), so the data is there. But that mark only has an inline
// `toDOM` (renders text-content deletions as `<del>` with strikethrough
// – see SuggestionMarks.ts) and no styling at the block level, so the
// deleted block still *visually* renders identically to an accepted
// block. Decide whether block-level `<y-attributed-delete>` should
// also have a visible affordance (a left bar, fade-out, …) so
// reviewers can tell from the editor that a block is pending removal.
//
// Heading + paragraph -> remove the paragraph.
test("suggestion mode: remove paragraph from heading+paragraph", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "remove body" });

  editor.replaceBlocks(editor.document, [
    { id: "h0", type: "heading", props: { level: 1 }, content: "Title" },
    { id: "p0", type: "paragraph", content: "Body text" },
  ]);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("Body text"));

  // See note in "add paragraph after existing block" – snapshot the
  // clean base before suggestions mutate the bound `baseDoc`.
  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.removeBlocks(["p0"]);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "add-remove-remove-paragraph",
  );

  expect(baseDocXml).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="h0">
        <heading
          backgroundColor="default"
          isToggleable="false"
          level="1"
          textAlignment="left"
          textColor="default"
        >Title</heading>
      </blockContainer>
      <blockContainer id="p0">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Body text</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="h0">
        <heading
          backgroundColor="default"
          isToggleable="false"
          level="1"
          textAlignment="left"
          textColor="default"
        >Title</heading>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="h0">
          <heading
            backgroundColor="default"
            textColor="default"
            textAlignment="left"
            level="1"
            isToggleable="false"
          >Title</heading>
        </blockContainer>
        <y-attributed-delete userIds="" user-color="#30bced">
          <blockContainer id="p0">
            <paragraph backgroundColor="default" textColor="default" textAlignment="left">Body text</paragraph>
          </blockContainer>
        </y-attributed-delete>
      </blockGroup>
    </doc>"
  `);
});

// Remove every block from a doc that has one paragraph.
test("suggestion mode: remove all blocks", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "delete all" });

  editor.replaceBlocks(editor.document, [
    { id: "p0", type: "paragraph", content: "Only block" },
  ]);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("Only block"));

  // See note in "add paragraph after existing block" – snapshot the
  // clean base before suggestions mutate the bound `baseDoc`.
  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.removeBlocks(["p0"]);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "add-remove-remove-all",
  );

  expect(baseDocXml).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="p0">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Only block</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="1">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default"></paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="1">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">
            <y-attributed-delete userIds="" user-color="#30bced">Only block</y-attributed-delete>
          </paragraph>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});

// Delete a nested child block, parent stays.
test("suggestion mode: delete nested block", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "delete inner block" });

  editor.replaceBlocks(editor.document, [
    {
      id: "parent",
      type: "paragraph",
      content: "Parent",
      children: [{ id: "child", type: "paragraph", content: "Child" }],
    },
  ]);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("Child"));

  // See note in "add paragraph after existing block" – snapshot the
  // clean base before suggestions mutate the bound `baseDoc`.
  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.removeBlocks(["child"]);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "add-remove-delete-nested",
  );

  expect(baseDocXml).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="parent">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Parent</paragraph>
        <blockGroup>
          <blockContainer id="child">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">Child</paragraph>
          </blockContainer>
        </blockGroup>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="parent">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Parent</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="parent">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">Parent</paragraph>
          <y-attributed-delete userIds="" user-color="#30bced">
            <blockGroup>
              <blockContainer id="child">
                <paragraph backgroundColor="default" textColor="default" textAlignment="left">Child</paragraph>
              </blockContainer>
            </blockGroup>
          </y-attributed-delete>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});

// Delete a parent block that has children. Documents what happens to
// the children – BlockNote may keep them as top-level siblings or
// delete them too.
test("suggestion mode: delete parent block (with children)", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "delete outer block" });

  editor.replaceBlocks(editor.document, [
    {
      id: "parent",
      type: "paragraph",
      content: "Parent",
      children: [{ id: "child", type: "paragraph", content: "Child" }],
    },
  ]);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("Parent"));

  // See note in "add paragraph after existing block" – snapshot the
  // clean base before suggestions mutate the bound `baseDoc`.
  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.removeBlocks(["parent"]);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "add-remove-delete-parent",
  );

  expect(baseDocXml).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="parent">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Parent</paragraph>
        <blockGroup>
          <blockContainer id="child">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">Child</paragraph>
          </blockContainer>
        </blockGroup>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="1">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default"></paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="1">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">
            <y-attributed-delete userIds="" user-color="#30bced">Parent</y-attributed-delete>
          </paragraph>
          <y-attributed-delete userIds="" user-color="#30bced">
            <blockGroup>
              <blockContainer id="child">
                <paragraph backgroundColor="default" textColor="default" textAlignment="left">Child</paragraph>
              </blockContainer>
            </blockGroup>
          </y-attributed-delete>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});

// Delete the sole image block in suggestion mode. An image is an atom
// blockContent with no inline text and no blockGroup child, so the only
// schema-valid way to attribute its deletion is to wrap the whole
// Deleting a sole atom image block: the suggestion diff marks the image
// block as deleted.
test("suggestion mode: delete image block", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({
      userAction: "delete image",
    });

  editor.replaceBlocks(editor.document, [
    {
      id: "img",
      type: "image",
      props: { url: IMG_SRC, previewWidth: 150 },
    },
  ]);
  await sync();
  await expect
    .poll(() => (editor.document[0]?.props as { url?: string })?.url)
    .toBe(IMG_SRC);

  // See note in "add paragraph after existing block" – snapshot the
  // clean base before suggestions mutate the bound `baseDoc`.
  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.removeBlocks(["img"]);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-A"),
    "add-remove-delete-image",
  );

  expect(baseDocXml).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="img">
        <image
          backgroundColor="default"
          caption=""
          name=""
          previewWidth="150"
          showPreview="true"
          textAlignment="left"
          url="data:image/svg+xml;utf8,&lt;svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'&gt;&lt;rect width='100' height='100' fill='%23ff6b6b'/&gt;&lt;/svg&gt;"
        ></image>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="1">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default"></paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <y-attributed-delete userIds="" user-color="#30bced">
          <blockContainer id="img">
            <image
              textAlignment="left"
              backgroundColor="default"
              name=""
              url="data:image/svg+xml;utf8,&lt;svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'&gt;&lt;rect width='100' height='100' fill='%23ff6b6b'/&gt;&lt;/svg&gt;"
              caption=""
              showPreview="true"
              previewWidth="150"
            ></image>
          </blockContainer>
        </y-attributed-delete>
        <y-attributed-insert userIds="" user-color="#30bced">
          <blockContainer id="1">
            <y-attributed-insert userIds="" user-color="#30bced">
              <paragraph backgroundColor="default" textColor="default" textAlignment="left"></paragraph>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});
