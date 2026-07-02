/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for move-block suggestions: relocating a
 * whole block (with or without children) using `moveBlocksUp` /
 * `moveBlocksDown`. Same shape as the other categories.
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
// suggestion-gallery example so the gallery and these tests never drift.
import { scenarios } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";

const moveParagraphUp = scenarios.find((s) => s.id === "move-paragraph-up")!;
const moveParagraphWithChildren = scenarios.find(
  (s) => s.id === "move-paragraph-with-children",
)!;

// Move a plain paragraph one slot up. Base has three siblings; we
// move the middle one to the top.
test("suggestion mode: move paragraph up", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "move middle up" });

  editor.replaceBlocks(editor.document, moveParagraphUp.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("First"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  moveParagraphUp.apply(editor);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "move-paragraph-up",
  );

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="first">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">First</paragraph>
      </blockContainer>
      <blockContainer id="middle">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Middle</paragraph>
      </blockContainer>
      <blockContainer id="last">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Last</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="middle">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Middle</paragraph>
      </blockContainer>
      <blockContainer id="first">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">First</paragraph>
      </blockContainer>
      <blockContainer id="last">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Last</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <y-attributed-insert
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="middle">
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
                >Middle</y-attributed-insert>
              </paragraph>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
        <blockContainer id="first">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">First</paragraph>
        </blockContainer>
        <y-attributed-delete
          userIds=""
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="middle">
            <paragraph backgroundColor="default" textColor="default" textAlignment="left">Middle</paragraph>
          </blockContainer>
        </y-attributed-delete>
        <blockContainer id="last">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">Last</paragraph>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});

// Move a paragraph that has a nested child. The whole subtree should
// travel together.
test("suggestion mode: move paragraph with children", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "move parent + child up" });

  editor.replaceBlocks(editor.document, moveParagraphWithChildren.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("First"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  moveParagraphWithChildren.apply(editor);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "move-paragraph-with-children",
  );

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="first">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">First</paragraph>
      </blockContainer>
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
        <blockGroup>
          <blockContainer id="child">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">Child</paragraph>
          </blockContainer>
        </blockGroup>
      </blockContainer>
      <blockContainer id="first">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">First</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
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
                  <blockContainer id="child">
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
                        >Child</y-attributed-insert>
                      </paragraph>
                    </y-attributed-insert>
                  </blockContainer>
                </y-attributed-insert>
              </blockGroup>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
        <blockContainer id="first">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">First</paragraph>
        </blockContainer>
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
      </blockGroup>
    </doc>"
  `);
});
