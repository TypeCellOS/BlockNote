/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for link suggestions: adding, editing and
 * removing an inline link (`updateBlock` with link inline content).
 * Same shape as the other single-scenario categories.
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

// Scenario data is shared with the suggestion-gallery example so the gallery and
// these tests never drift.
import { scenarios } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";
import type { SingleScenario } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";

const addLink = scenarios.find((s) => s.id === "add-link") as SingleScenario;
const editLink = scenarios.find((s) => s.id === "edit-link") as SingleScenario;
const removeLink = scenarios.find(
  (s) => s.id === "remove-link",
) as SingleScenario;

// Plain text gets part of it turned into a link.
test("suggestion mode: add a link", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "add link" });

  editor.replaceBlocks(editor.document, addLink.initial);
  await sync();
  await expectVisible(
    screen.getByTestId("editor-A").getByText("Visit the site"),
  );

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  addLink.apply(editor);

  await waitForSuggestion(editor);

  await expectScreenshot(screen.getByTestId("editor-root"), "links-add-link");

  expect(baseDocXml).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="p">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Visit the site</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="p">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">
          Visit
          <link value="{&quot;href&quot;:&quot;https://example.com&quot;}" />the site</link>
      </paragraph>
    </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="p">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">
            Visit
            <y-attributed-format userIds="" format="[object Object]">
              <link href="https://example.com" />the site</link>
          </y-attributed-format>
        </paragraph>
      </blockContainer>
    </blockGroup>
    </doc>"
  `);
});

// An existing link has its URL and text changed.
test("suggestion mode: edit a link", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "edit link" });

  editor.replaceBlocks(editor.document, editLink.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("the old site"));

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  editLink.apply(editor);

  await waitForSuggestion(editor);

  await expectScreenshot(screen.getByTestId("editor-root"), "links-edit-link");

  expect(baseDocXml).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="p">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">
          Visit
          <link value="{&quot;href&quot;:&quot;https://old.example.com&quot;}" />the old site</link>
      </paragraph>
    </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="p">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">
          Visit
          <link value="{&quot;href&quot;:&quot;https://new.example.com&quot;}" />the new site</link>
      </paragraph>
    </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="p">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">
            Visit
            <y-attributed-format userIds="" format="[object Object]">
              <link href="https://new.example.com" />the</link>
          </y-attributed-format>
          <y-attributed-delete userIds="">
            <link href="https://old.example.com" />old</link>
        </y-attributed-delete>
        <y-attributed-format userIds="" format="[object Object]">
          <y-attributed-insert userIds="">
            <link href="https://new.example.com" />new</link>
        </y-attributed-insert>
      </y-attributed-format>
      <y-attributed-format userIds="" format="[object Object]">
        <link href="https://new.example.com" />site</link>
    </y-attributed-format>
    </paragraph>
    </blockContainer>
    </blockGroup>
    </doc>"
  `);
});

// An existing link is unlinked, keeping its text.
test("suggestion mode: remove a link", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "remove link" });

  editor.replaceBlocks(editor.document, removeLink.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("the site"));

  const baseDocXml = ydocXml(baseDoc);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  removeLink.apply(editor);

  await waitForSuggestion(editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "links-remove-link",
  );

  expect(baseDocXml).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="p">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">
          Visit
          <link value="{&quot;href&quot;:&quot;https://example.com&quot;}" />the site</link>
      </paragraph>
    </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="p">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">Visit the site</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="p">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">
            Visit
            <y-attributed-format userIds="" format="[object Object]">the site</y-attributed-format>
          </paragraph>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});
