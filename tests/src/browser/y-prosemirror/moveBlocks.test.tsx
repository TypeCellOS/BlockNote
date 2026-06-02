/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for move-block suggestions: relocating a
 * whole block (with or without children) using `moveBlocksUp` /
 * `moveBlocksDown`. Same shape as the other categories.
 */
import { SuggestionsExtension } from "@blocknote/core/y";
import { expect, test } from "vitest";

import {
  editorHtml,
  setupSuggestionTest,
  waitForSuggestion,
  ydocXml,
} from "./fixtures/suggestionFixture.js";

// Move a plain paragraph one slot up. Base has three siblings; we
// move the middle one to the top.
test("suggestion mode: move paragraph up", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "move middle up" });

  editor.replaceBlocks(editor.document, [
    { id: "first", type: "paragraph", content: "First" },
    { id: "middle", type: "paragraph", content: "Middle" },
    { id: "last", type: "paragraph", content: "Last" },
  ]);
  sync();
  await expect
    .element(screen.getByTestId("editor-A").getByText("First"))
    .toBeVisible();

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.moveBlocksUp("middle");

  await waitForSuggestion(editor);

  await expect(screen.getByTestId("editor-root")).toMatchScreenshot(
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
        <y-attributed-insert user-color="#30bced">
          <blockContainer id="middle">
            <y-attributed-insert user-color="#30bced">
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                <y-attributed-insert user-color="#30bced">Middle</y-attributed-insert>
              </paragraph>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
        <blockContainer id="first">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">First</paragraph>
        </blockContainer>
        <y-attributed-delete user-color="#30bced">
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

  editor.replaceBlocks(editor.document, [
    { id: "first", type: "paragraph", content: "First" },
    {
      id: "parent",
      type: "paragraph",
      content: "Parent",
      children: [{ id: "child", type: "paragraph", content: "Child" }],
    },
  ]);
  sync();
  await expect
    .element(screen.getByTestId("editor-A").getByText("First"))
    .toBeVisible();

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editor.moveBlocksUp("parent");

  await waitForSuggestion(editor);

  await expect(screen.getByTestId("editor-root")).toMatchScreenshot(
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
        <y-attributed-insert user-color="#30bced">
          <blockContainer id="parent">
            <y-attributed-insert user-color="#30bced">
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                <y-attributed-insert user-color="#30bced">Parent</y-attributed-insert>
              </paragraph>
            </y-attributed-insert>
            <y-attributed-insert user-color="#30bced">
              <blockGroup>
                <y-attributed-insert user-color="#30bced">
                  <blockContainer id="child">
                    <y-attributed-insert user-color="#30bced">
                      <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                        <y-attributed-insert user-color="#30bced">Child</y-attributed-insert>
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
        <y-attributed-delete user-color="#30bced">
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
