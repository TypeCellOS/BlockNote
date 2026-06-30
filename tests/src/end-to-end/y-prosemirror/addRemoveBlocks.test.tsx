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
        <y-attributed-delete
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="1">
            <paragraph backgroundColor="default" textColor="default" textAlignment="left"></paragraph>
          </blockContainer>
        </y-attributed-delete>
        <y-attributed-insert
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="h0">
            <y-attributed-insert
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >
              <heading
                backgroundColor="default"
                textColor="default"
                textAlignment="left"
                level="1"
                isToggleable="false"
              >
                <y-attributed-insert
                  userIds=""
                  user-color-light="#fff0c2"
                  user-color-dark="#8a6d1a"
                >New heading</y-attributed-insert>
              </heading>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});

// Empty doc gets a bullet list item inserted at the top. Exercises the
// bullet marker (`•`) on suggestion-wrapped block content – the inserted
// item's `.bn-block-content` is wrapped in `<ins>`, which breaks the
// `.bn-block > .bn-block-content` chain the marker rule relies on.
test("suggestion mode: add bullet list item to empty doc", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "add bullet at top" });

  editor.replaceBlocks(editor.document, []);
  await sync();

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.replaceBlocks(editor.document, [
    { id: "b0", type: "bulletListItem", content: "New bullet" },
  ]);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "add-remove-add-bullet-to-empty",
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
      <blockContainer id="b0">
        <bulletListItem
          backgroundColor="default"
          textAlignment="left"
          textColor="default"
        >New bullet</bulletListItem>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <y-attributed-delete
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="1">
            <paragraph backgroundColor="default" textColor="default" textAlignment="left"></paragraph>
          </blockContainer>
        </y-attributed-delete>
        <y-attributed-insert
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="b0">
            <y-attributed-insert
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >
              <bulletListItem
                backgroundColor="default"
                textColor="default"
                textAlignment="left"
              >
                <y-attributed-insert
                  userIds=""
                  user-color-light="#fff0c2"
                  user-color-dark="#8a6d1a"
                >New bullet</y-attributed-insert>
              </bulletListItem>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});

// Empty doc gets a numbered list item inserted at the top. Exercises the
// numbered marker (`1.`) on suggestion-wrapped block content (same chain
// break as the bullet case above).
test("suggestion mode: add numbered list item to empty doc", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "add numbered at top" });

  editor.replaceBlocks(editor.document, []);
  await sync();

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.replaceBlocks(editor.document, [
    { id: "n0", type: "numberedListItem", content: "New numbered" },
  ]);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "add-remove-add-numbered-to-empty",
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
                            <blockContainer id="n0">
                              <numberedListItem
                                backgroundColor="default"
                                start="undefined"
                                textAlignment="left"
                                textColor="default"
                              >New numbered</numberedListItem>
                            </blockContainer>
                          </blockGroup>"
                        `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <y-attributed-delete
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="1">
            <paragraph backgroundColor="default" textColor="default" textAlignment="left"></paragraph>
          </blockContainer>
        </y-attributed-delete>
        <y-attributed-insert
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="n0">
            <y-attributed-insert
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >
              <numberedListItem
                backgroundColor="default"
                textColor="default"
                textAlignment="left"
              >
                <y-attributed-insert
                  userIds=""
                  user-color-light="#fff0c2"
                  user-color-dark="#8a6d1a"
                >New numbered</y-attributed-insert>
              </numberedListItem>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});

// Empty doc gets a 3-level nested bullet list inserted as a suggestion.
//
// TODO / KNOWN LIMITATION: nested bullets in suggestion mode render the
// top-level `•` at every depth instead of `•` / `◦` / `▪`. The glyph is chosen
// in CSS by depth-detecting chains (`[bulletListItem] ~ .bn-block-group >
// .bn-block-outer > .bn-block > .bn-block-content`), but every level of an
// inserted subtree is wrapped in the suggestion mark elements (`<ins>`/`<del>` +
// `.bn-suggestion-node`, all `display: contents`) — on the blockContainer,
// blockContent AND the children blockGroup — which breaks those chains at every
// joint (both the `~` sibling and the `>` child links). Skipping the wrappers in
// CSS at all of them is combinatorial and impractical.
// Fix: compute each bullet's nesting level in JS (e.g. a decoration plugin like
// `PreviousBlockType`, which already sets `data-*` attrs) and expose it as
// `data-bullet-level` on the content, then pick the glyph with a plain,
// wrapper-independent attribute selector:
//   [data-content-type="bulletListItem"][data-bullet-level="1"]::before { content: "◦"; }
// (This is why numbered lists, which use `--index: attr(data-index)`, are fine.)
// Until then this baseline intentionally captures all three rows as `•`.
test("suggestion mode: add nested bullet list to empty doc", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "add nested bullets" });

  editor.replaceBlocks(editor.document, []);
  await sync();

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.replaceBlocks(editor.document, [
    {
      id: "l0",
      type: "bulletListItem",
      content: "Level 0",
      children: [
        {
          id: "l1",
          type: "bulletListItem",
          content: "Level 1",
          children: [{ id: "l2", type: "bulletListItem", content: "Level 2" }],
        },
      ],
    },
  ]);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "add-remove-add-nested-bullets-to-empty",
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
      <blockContainer id="l0">
        <bulletListItem
          backgroundColor="default"
          textAlignment="left"
          textColor="default"
        >Level 0</bulletListItem>
        <blockGroup>
          <blockContainer id="l1">
            <bulletListItem
              backgroundColor="default"
              textAlignment="left"
              textColor="default"
            >Level 1</bulletListItem>
            <blockGroup>
              <blockContainer id="l2">
                <bulletListItem
                  backgroundColor="default"
                  textAlignment="left"
                  textColor="default"
                >Level 2</bulletListItem>
              </blockContainer>
            </blockGroup>
          </blockContainer>
        </blockGroup>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <y-attributed-delete
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="1">
            <paragraph backgroundColor="default" textColor="default" textAlignment="left"></paragraph>
          </blockContainer>
        </y-attributed-delete>
        <y-attributed-insert
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="l0">
            <y-attributed-insert
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >
              <bulletListItem
                backgroundColor="default"
                textColor="default"
                textAlignment="left"
              >
                <y-attributed-insert
                  userIds=""
                  user-color-light="#fff0c2"
                  user-color-dark="#8a6d1a"
                >Level 0</y-attributed-insert>
              </bulletListItem>
            </y-attributed-insert>
            <y-attributed-insert
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >
              <blockGroup>
                <y-attributed-insert
                  userIds=""
                  user-color-light="#fff0c2"
                  user-color-dark="#8a6d1a"
                >
                  <blockContainer id="l1">
                    <y-attributed-insert
                      userIds=""
                      user-color-light="#fff0c2"
                      user-color-dark="#8a6d1a"
                    >
                      <bulletListItem
                        backgroundColor="default"
                        textColor="default"
                        textAlignment="left"
                      >
                        <y-attributed-insert
                          userIds=""
                          user-color-light="#fff0c2"
                          user-color-dark="#8a6d1a"
                        >Level 1</y-attributed-insert>
                      </bulletListItem>
                    </y-attributed-insert>
                    <y-attributed-insert
                      userIds=""
                      user-color-light="#fff0c2"
                      user-color-dark="#8a6d1a"
                    >
                      <blockGroup>
                        <y-attributed-insert
                          userIds=""
                          user-color-light="#fff0c2"
                          user-color-dark="#8a6d1a"
                        >
                          <blockContainer id="l2">
                            <y-attributed-insert
                              userIds=""
                              user-color-light="#fff0c2"
                              user-color-dark="#8a6d1a"
                            >
                              <bulletListItem
                                backgroundColor="default"
                                textColor="default"
                                textAlignment="left"
                              >
                                <y-attributed-insert
                                  userIds=""
                                  user-color-light="#fff0c2"
                                  user-color-dark="#8a6d1a"
                                >Level 2</y-attributed-insert>
                              </bulletListItem>
                            </y-attributed-insert>
                          </blockContainer>
                        </y-attributed-insert>
                      </blockGroup>
                    </y-attributed-insert>
                  </blockContainer>
                </y-attributed-insert>
              </blockGroup>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});

// Empty doc gets a background-colored block (with a nested child) inserted as a
// suggestion. The colored `.bn-block-content` is wrapped in `<ins>`, which
// breaks `.bn-block:has(> .bn-block-content[data-background-color="…"])` – the
// block-level fill that tints the nested child's area is lost (the content's
// own fill still applies via the bare `[data-background-color]` selector).
// Validate: the parent row is tinted but the child's row is not.
test("suggestion mode: add colored block with child to empty doc", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "add colored block" });

  editor.replaceBlocks(editor.document, []);
  await sync();

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.replaceBlocks(editor.document, [
    {
      id: "c0",
      type: "paragraph",
      props: { backgroundColor: "blue" },
      content: "Colored parent",
      children: [{ id: "c1", type: "paragraph", content: "Child block" }],
    },
  ]);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "add-remove-add-colored-block-to-empty",
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
      <blockContainer id="c0">
        <paragraph backgroundColor="blue" textAlignment="left" textColor="default">Colored parent</paragraph>
        <blockGroup>
          <blockContainer id="c1">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">Child block</paragraph>
          </blockContainer>
        </blockGroup>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="c0">
          <paragraph backgroundColor="blue" textColor="default" textAlignment="left">
            <y-attributed-insert
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >Colored parent</y-attributed-insert>
          </paragraph>
          <y-attributed-insert
            userIds=""
            user-color-light="#fff0c2"
            user-color-dark="#8a6d1a"
          >
            <blockGroup>
              <y-attributed-insert
                userIds=""
                user-color-light="#fff0c2"
                user-color-dark="#8a6d1a"
              >
                <blockContainer id="c1">
                  <y-attributed-insert
                    userIds=""
                    user-color-light="#fff0c2"
                    user-color-dark="#8a6d1a"
                  >
                    <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                      <y-attributed-insert
                        userIds=""
                        user-color-light="#fff0c2"
                        user-color-dark="#8a6d1a"
                      >Child block</y-attributed-insert>
                    </paragraph>
                  </y-attributed-insert>
                </blockContainer>
              </y-attributed-insert>
            </blockGroup>
          </y-attributed-insert>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});

// Two sibling bullets exist in the base; in suggestion mode the second is
// nested under the first (`nestBlock`). Unlike the all-new subtree above, the
// parent bullet already exists – only the newly-nested child is the suggestion.
//
// TODO / KNOWN LIMITATION: like "add nested bullet list to empty doc" above, the
// nested child shows `•` instead of `◦` — `nestBlock` also wraps the new
// blockGroup, breaking the CSS depth-detection chains. See that test for the
// full explanation and the `data-bullet-level` fix. Baseline captures `•`.
test("suggestion mode: nest a bullet under an existing bullet", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "nest bullet under existing" });

  editor.replaceBlocks(editor.document, [
    { id: "p", type: "bulletListItem", content: "Parent" },
    { id: "c", type: "bulletListItem", content: "Child" },
  ]);
  await sync();

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.setTextCursorPosition("c", "start");
  editor.nestBlock();

  await expect.poll(() => editor.document[0]?.children?.length).toBe(1);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "add-remove-nest-bullet-under-existing",
  );

  expect(baseDocXml).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="p">
        <bulletListItem
          backgroundColor="default"
          textAlignment="left"
          textColor="default"
        >Parent</bulletListItem>
      </blockContainer>
      <blockContainer id="c">
        <bulletListItem
          backgroundColor="default"
          textAlignment="left"
          textColor="default"
        >Child</bulletListItem>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="p">
        <bulletListItem
          backgroundColor="default"
          textAlignment="left"
          textColor="default"
        >Parent</bulletListItem>
        <blockGroup>
          <blockContainer id="c">
            <bulletListItem
              backgroundColor="default"
              textAlignment="left"
              textColor="default"
            >Child</bulletListItem>
          </blockContainer>
        </blockGroup>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="p">
          <bulletListItem
            backgroundColor="default"
            textColor="default"
            textAlignment="left"
          >Parent</bulletListItem>
          <y-attributed-insert
            userIds=""
            user-color-light="#fff0c2"
            user-color-dark="#8a6d1a"
          >
            <blockGroup>
              <y-attributed-insert
                userIds=""
                user-color-light="#fff0c2"
                user-color-dark="#8a6d1a"
              >
                <blockContainer id="c">
                  <y-attributed-insert
                    userIds=""
                    user-color-light="#fff0c2"
                    user-color-dark="#8a6d1a"
                  >
                    <bulletListItem
                      backgroundColor="default"
                      textColor="default"
                      textAlignment="left"
                    >
                      <y-attributed-insert
                        userIds=""
                        user-color-light="#fff0c2"
                        user-color-dark="#8a6d1a"
                      >Child</y-attributed-insert>
                    </bulletListItem>
                  </y-attributed-insert>
                </blockContainer>
              </y-attributed-insert>
            </blockGroup>
          </y-attributed-insert>
        </blockContainer>
        <y-attributed-delete
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="c">
            <bulletListItem
              backgroundColor="default"
              textColor="default"
              textAlignment="left"
            >Child</bulletListItem>
          </blockContainer>
        </y-attributed-delete>
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
        <y-attributed-insert
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="p0">
            <y-attributed-insert
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                <y-attributed-insert
                  userIds=""
                  user-color-light="#fff0c2"
                  user-color-dark="#8a6d1a"
                >Body text</y-attributed-insert>
              </paragraph>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});

// Block-level deletions render with a visible affordance so reviewers can spot a
// pending removal: a deleted block with inline content strikes its text through
// in the author's color, while one with no inline content (image, divider, …)
// shows a filled "Deleted" card (both styled per `.bn-block-content` in
// Block.css). The node-level `<y-attributed-delete>` mark in the PM doc (visible
// in the snapshots) carries the data.
//
// Heading + paragraph -> remove the paragraph; the deleted body strikes through.
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
        <y-attributed-delete
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
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
            <y-attributed-delete
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >Only block</y-attributed-delete>
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
          <y-attributed-delete
            userIds=""
            user-color-light="#fff0c2"
            user-color-dark="#8a6d1a"
          >
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
            <y-attributed-delete
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >Parent</y-attributed-delete>
          </paragraph>
          <y-attributed-delete
            userIds=""
            user-color-light="#fff0c2"
            user-color-dark="#8a6d1a"
          >
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
        <y-attributed-delete
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
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
        <y-attributed-insert
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="1">
            <y-attributed-insert
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >
              <paragraph backgroundColor="default" textColor="default" textAlignment="left"></paragraph>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});

// A deleted parent paragraph whose children are a nested paragraph AND a nested
// image. Validates the *per-block* delete decision (the whole point of the
// inline-vs-block logic): the parent + nested paragraph (inline content) strike
// through, while the nested image (no inline content) gets the "DELETED" badge —
// all within the same deletion.
test("suggestion mode: delete parent with nested paragraph and image", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "delete mixed block" });

  editor.replaceBlocks(editor.document, [
    {
      id: "parent",
      type: "paragraph",
      content: "Parent",
      children: [
        { id: "p1", type: "paragraph", content: "Nested paragraph" },
        {
          id: "img",
          type: "image",
          props: { url: IMG_SRC, previewWidth: 150 },
        },
      ],
    },
  ]);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("Parent"));

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.removeBlocks(["parent"]);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "add-remove-delete-mixed-parent",
  );

  expect(baseDocXml).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="parent">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Parent</paragraph>
        <blockGroup>
          <blockContainer id="p1">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">Nested paragraph</paragraph>
          </blockContainer>
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
            <y-attributed-delete
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >Parent</y-attributed-delete>
          </paragraph>
          <y-attributed-delete
            userIds=""
            user-color-light="#fff0c2"
            user-color-dark="#8a6d1a"
          >
            <blockGroup>
              <blockContainer id="p1">
                <paragraph backgroundColor="default" textColor="default" textAlignment="left">Nested paragraph</paragraph>
              </blockContainer>
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
            </blockGroup>
          </y-attributed-delete>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});

// A deleted code block. Its inline content lives in `<pre><code class=
// "bn-inline-content">`, nested below `.bn-block-content` — so the descendant
// `:has(.bn-inline-content)` must still classify it as an inline-content block
// and strike it through, rather than show the block "DELETED" badge.
test("suggestion mode: delete code block", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "delete code block" });

  editor.replaceBlocks(editor.document, [
    { id: "code", type: "codeBlock", content: "const x = 1;" },
  ]);
  await sync();
  await expect.poll(() => editor.document[0]?.type).toBe("codeBlock");

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.removeBlocks(["code"]);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "add-remove-delete-code-block",
  );

  expect(baseDocXml).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="code">
        <codeBlock language="text">const x = 1;</codeBlock>
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
        <y-attributed-delete
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="code">
            <codeBlock language="text">const x = 1;</codeBlock>
          </blockContainer>
        </y-attributed-delete>
        <y-attributed-insert
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="1">
            <y-attributed-insert
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >
              <paragraph backgroundColor="default" textColor="default" textAlignment="left"></paragraph>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});

// A deleted divider (`<hr>`, content: "none") takes the block "DELETED" card.
// Edge case for the card's `width: fit-content`: an <hr> has no intrinsic width,
// so the card could collapse to just the label — this baseline captures the
// actual rendering so any regression there is visible.
test("suggestion mode: delete divider", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "delete divider" });

  editor.replaceBlocks(editor.document, [{ id: "hr", type: "divider" }]);
  await sync();
  await expect.poll(() => editor.document[0]?.type).toBe("divider");

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.removeBlocks(["hr"]);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "add-remove-delete-divider",
  );

  expect(baseDocXml).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="hr">
        <divider></divider>
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
        <y-attributed-delete
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="hr">
            <divider></divider>
          </blockContainer>
        </y-attributed-delete>
        <y-attributed-insert
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="1">
            <y-attributed-insert
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >
              <paragraph backgroundColor="default" textColor="default" textAlignment="left"></paragraph>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});

// An inserted image (no inline content) takes the same per-block card as a deleted
// one — author-colored, rounded, hugging the image — but with no "Deleted" label.
// Confirms the card background is shared between insertions and deletions for
// non-inline blocks, while inserted inline content (covered by the other insert
// tests) keeps only its inline highlight and gets no block background.
test("suggestion mode: insert image block", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "insert image" });

  editor.replaceBlocks(editor.document, []);
  await sync();

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.replaceBlocks(editor.document, [
    { id: "img", type: "image", props: { url: IMG_SRC, previewWidth: 150 } },
  ]);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "add-remove-insert-image",
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
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <y-attributed-delete
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="1">
            <paragraph backgroundColor="default" textColor="default" textAlignment="left"></paragraph>
          </blockContainer>
        </y-attributed-delete>
        <y-attributed-insert
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="img">
            <y-attributed-insert
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >
              <image
                textAlignment="left"
                backgroundColor="default"
                name=""
                url="data:image/svg+xml;utf8,&lt;svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'&gt;&lt;rect width='100' height='100' fill='%23ff6b6b'/&gt;&lt;/svg&gt;"
                caption=""
                showPreview="true"
                previewWidth="150"
              ></image>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});
