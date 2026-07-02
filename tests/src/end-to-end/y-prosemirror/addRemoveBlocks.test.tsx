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

// Scenario data (the `initial` seed + the `apply` change) is shared with the
// suggestion-gallery example so the gallery and these tests never drift. The
// image URL is imported from there too, so the poll below checks the exact value
// the scenario sets.
import {
  IMG_SRC_BASE,
  scenarios,
} from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";
import type { SingleScenario } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";

const addHeading = scenarios.find(
  (s) => s.id === "add-heading",
) as SingleScenario;
const addBullet = scenarios.find(
  (s) => s.id === "add-bullet",
) as SingleScenario;
const addNumbered = scenarios.find(
  (s) => s.id === "add-numbered",
) as SingleScenario;
const addNestedBullets = scenarios.find(
  (s) => s.id === "add-nested-bullets",
) as SingleScenario;
const addColoredBlock = scenarios.find(
  (s) => s.id === "add-colored-block",
) as SingleScenario;
const nestBulletExisting = scenarios.find(
  (s) => s.id === "nest-bullet-existing",
) as SingleScenario;
const addParagraphAfter = scenarios.find(
  (s) => s.id === "add-paragraph-after",
) as SingleScenario;
const removeParagraph = scenarios.find(
  (s) => s.id === "remove-paragraph",
) as SingleScenario;
const removeAll = scenarios.find(
  (s) => s.id === "remove-all",
) as SingleScenario;
const deleteNested = scenarios.find(
  (s) => s.id === "delete-nested",
) as SingleScenario;
const deleteParent = scenarios.find(
  (s) => s.id === "delete-parent",
) as SingleScenario;
const deleteImage = scenarios.find(
  (s) => s.id === "delete-image",
) as SingleScenario;
const deleteMixedParent = scenarios.find(
  (s) => s.id === "delete-mixed-parent",
) as SingleScenario;
const deleteCodeBlock = scenarios.find(
  (s) => s.id === "delete-code-block",
) as SingleScenario;
const deleteDivider = scenarios.find(
  (s) => s.id === "delete-divider",
) as SingleScenario;
const insertImage = scenarios.find(
  (s) => s.id === "insert-image",
) as SingleScenario;

// Empty doc gets a heading inserted at the top.
test("suggestion mode: add heading to empty doc", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "add heading at top" });

  editor.replaceBlocks(editor.document, addHeading.initial);
  await sync();

  // See note in "add paragraph after existing block" – snapshot the
  // clean base before suggestions mutate the bound `baseDoc`.
  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  addHeading.apply(editor);

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

  editor.replaceBlocks(editor.document, addBullet.initial);
  await sync();

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  addBullet.apply(editor);

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

  editor.replaceBlocks(editor.document, addNumbered.initial);
  await sync();

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  addNumbered.apply(editor);

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
// Known issue — tracked in the suggestion gallery ("add-nested-bullets").
// This baseline intentionally captures all three rows as `•`.
test("suggestion mode: add nested bullet list to empty doc", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "add nested bullets" });

  editor.replaceBlocks(editor.document, addNestedBullets.initial);
  await sync();

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  addNestedBullets.apply(editor);

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
// suggestion.
// Known issue — tracked in the suggestion gallery ("add-colored-block").
// Validate: the parent row is tinted but the child's row is not.
test("suggestion mode: add colored block with child to empty doc", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "add colored block" });

  editor.replaceBlocks(editor.document, addColoredBlock.initial);
  await sync();

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  addColoredBlock.apply(editor);

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
          <blockContainer id="c0">
            <y-attributed-insert
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >
              <paragraph backgroundColor="blue" textColor="default" textAlignment="left">
                <y-attributed-insert
                  userIds=""
                  user-color-light="#fff0c2"
                  user-color-dark="#8a6d1a"
                >Colored parent</y-attributed-insert>
              </paragraph>
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
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});

// Two sibling bullets exist in the base; in suggestion mode the second is
// nested under the first (`nestBlock`). Unlike the all-new subtree above, the
// parent bullet already exists – only the newly-nested child is the suggestion.
//
// Known issue — tracked in the suggestion gallery ("nest-bullet-existing"):
// the nested child shows `•` instead of `◦`. Baseline captures `•`.
test("suggestion mode: nest a bullet under an existing bullet", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "nest bullet under existing" });

  editor.replaceBlocks(editor.document, nestBulletExisting.initial);
  await sync();

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  nestBulletExisting.apply(editor);

  await waitForSuggestion(editor);

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
        <y-attributed-delete
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="p">
            <bulletListItem
              backgroundColor="default"
              textColor="default"
              textAlignment="left"
            >Parent</bulletListItem>
          </blockContainer>
        </y-attributed-delete>
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
        <y-attributed-insert
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="p">
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
                >Parent</y-attributed-insert>
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
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});

// Add a paragraph after an existing heading.
test("suggestion mode: add paragraph after existing block", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "append paragraph" });

  editor.replaceBlocks(editor.document, addParagraphAfter.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("Title"));

  // Capture the base document *before* enabling suggestions: `baseDoc`
  // is the live fragment editor A is bound to, so suggestion-mode edits
  // flush attribution marks back into it. Reading it after the edit is
  // racy; snapshot the clean pre-suggestion state here instead.
  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  addParagraphAfter.apply(editor);

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

  editor.replaceBlocks(editor.document, removeParagraph.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("Body text"));

  // See note in "add paragraph after existing block" – snapshot the
  // clean base before suggestions mutate the bound `baseDoc`.
  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  removeParagraph.apply(editor);

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

  editor.replaceBlocks(editor.document, removeAll.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("Only block"));

  // See note in "add paragraph after existing block" – snapshot the
  // clean base before suggestions mutate the bound `baseDoc`.
  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  removeAll.apply(editor);

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

  editor.replaceBlocks(editor.document, deleteNested.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("Child"));

  // See note in "add paragraph after existing block" – snapshot the
  // clean base before suggestions mutate the bound `baseDoc`.
  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  deleteNested.apply(editor);

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
        <y-attributed-delete
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="parent">
            <paragraph backgroundColor="default" textColor="default" textAlignment="left">Parent</paragraph>
            <blockGroup>
              <blockContainer id="child">
                <paragraph backgroundColor="default" textColor="default" textAlignment="left">Child</paragraph>
              </blockContainer>
            </blockGroup>
          </blockContainer>
        </y-attributed-delete>
        <y-attributed-insert
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="parent">
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
                >Parent</y-attributed-insert>
              </paragraph>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
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

  editor.replaceBlocks(editor.document, deleteParent.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("Parent"));

  // See note in "add paragraph after existing block" – snapshot the
  // clean base before suggestions mutate the bound `baseDoc`.
  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  deleteParent.apply(editor);

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
        <y-attributed-delete
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="parent">
            <paragraph backgroundColor="default" textColor="default" textAlignment="left">Parent</paragraph>
            <blockGroup>
              <blockContainer id="child">
                <paragraph backgroundColor="default" textColor="default" textAlignment="left">Child</paragraph>
              </blockContainer>
            </blockGroup>
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

  editor.replaceBlocks(editor.document, deleteImage.initial);
  await sync();
  await expect
    .poll(() => (editor.document[0]?.props as { url?: string })?.url)
    .toBe(IMG_SRC_BASE);

  // See note in "add paragraph after existing block" – snapshot the
  // clean base before suggestions mutate the bound `baseDoc`.
  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  deleteImage.apply(editor);

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

  editor.replaceBlocks(editor.document, deleteMixedParent.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("Parent"));

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  deleteMixedParent.apply(editor);

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
        <y-attributed-delete
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="parent">
            <paragraph backgroundColor="default" textColor="default" textAlignment="left">Parent</paragraph>
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

// A deleted code block. Its inline content lives in `<pre><code class=
// "bn-inline-content">`, nested below `.bn-block-content` — so the descendant
// `:has(.bn-inline-content)` must still classify it as an inline-content block
// and strike it through, rather than show the block "DELETED" badge.
test("suggestion mode: delete code block", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "delete code block" });

  editor.replaceBlocks(editor.document, deleteCodeBlock.initial);
  await sync();
  await expect.poll(() => editor.document[0]?.type).toBe("codeBlock");

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  deleteCodeBlock.apply(editor);

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

  editor.replaceBlocks(editor.document, deleteDivider.initial);
  await sync();
  await expect.poll(() => editor.document[0]?.type).toBe("divider");

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  deleteDivider.apply(editor);

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

  editor.replaceBlocks(editor.document, insertImage.initial);
  await sync();

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  insertImage.apply(editor);

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
