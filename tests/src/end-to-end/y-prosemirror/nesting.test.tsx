/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for nesting-related suggestions: indent,
 * unindent, and type-change on a block that already has children.
 * Same shape as `propChanges.test.tsx`.
 */
import { SuggestionsExtension } from "@blocknote/core/y";
import { expect, test } from "vite-plus/test";
import { expectScreenshot, expectVisible } from "./fixtures/browserExpect.js";

import {
  editorHtml,
  setupSuggestionTest,
  ydocXml,
} from "./fixtures/suggestionFixture.js";

// Scenario data (the `initial` seed + the `apply` change) is shared with the
// suggestion-gallery example so the gallery and these tests never drift.
import { scenarios } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";

const indentBlock = scenarios.find((s) => s.id === "nesting-indent")!;
const unindentBlock = scenarios.find((s) => s.id === "nesting-unindent")!;
const changeParentType = scenarios.find(
  (s) => s.id === "nesting-change-parent-type",
)!;

// Indent: take two sibling paragraphs and nest the second under the
// first.
test("suggestion mode: indent a block", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "indent N1" });

  editor.replaceBlocks(editor.document, indentBlock.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("N0"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  indentBlock.apply(editor);

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
                <blockContainer id="n1">
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
                      >N1</y-attributed-insert>
                    </paragraph>
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

  editor.replaceBlocks(editor.document, unindentBlock.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("N0"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  unindentBlock.apply(editor);

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
          <y-attributed-delete
            userIds=""
            user-color-light="#fff0c2"
            user-color-dark="#8a6d1a"
          >
            <blockGroup>
              <blockContainer id="n1">
                <paragraph backgroundColor="default" textColor="default" textAlignment="left">N1</paragraph>
              </blockContainer>
            </blockGroup>
          </y-attributed-delete>
        </blockContainer>
        <y-attributed-insert
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="n1">
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
                >N1</y-attributed-insert>
              </paragraph>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});

// Change parent block's type while keeping its children.
test("suggestion mode: change block type of a block with children", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "parent → heading" });

  editor.replaceBlocks(editor.document, changeParentType.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("N0"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  changeParentType.apply(editor);

  // TODO: should this be editor.document[0], or expose .documentWithoutDeletions?
  await expect.poll(() => editor.document[1]?.type).toBe("heading");

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "nesting-change-parent-type",
  );

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
        <heading
          backgroundColor="default"
          isToggleable="false"
          level="1"
          textAlignment="left"
          textColor="default"
        >N0</heading>
        <blockGroup>
          <blockContainer id="n1">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">N1</paragraph>
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
          <blockContainer id="n0">
            <paragraph backgroundColor="default" textColor="default" textAlignment="left">N0</paragraph>
            <blockGroup>
              <blockContainer id="n1">
                <paragraph backgroundColor="default" textColor="default" textAlignment="left">N1</paragraph>
              </blockContainer>
            </blockGroup>
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
                >N0</y-attributed-insert>
              </heading>
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
                  <blockContainer id="n1">
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
                        >N1</y-attributed-insert>
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
