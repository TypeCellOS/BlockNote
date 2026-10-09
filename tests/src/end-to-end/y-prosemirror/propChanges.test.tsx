/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for prop-change suggestions: block-level
 * attribute edits (text alignment, heading level, image width / source,
 * etc.) rather than content/text edits. Each test follows the same
 * shape as `basicText.test.tsx`: seed, enable suggestions, edit, then
 * screenshot + inline snapshots of base/suggestion docs + PM doc.
 */
import { AttributionExtension, SuggestionsExtension } from "@blocknote/core/y";
import { expect, test } from "vite-plus/test";
import { expectScreenshot, expectVisible } from "./fixtures/browserExpect.js";

import {
  editorHtml,
  setupSuggestionTest,
  ydocXml,
  waitForSuggestion,
} from "./fixtures/suggestionFixture.js";

// Scenario data (the `initial` seed + the `apply` change) is shared with the
// suggestion-gallery example so the gallery and these tests never drift. The
// image URLs are imported from there too, so the polls below check the exact
// value the scenario sets.
import {
  IMG_SRC_BASE,
  IMG_SRC_NEW,
  scenarios,
} from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";
import type { SingleScenario } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";

const textAlignment = scenarios.find(
  (s) => s.id === "prop-text-alignment",
) as SingleScenario;
const headingLevel = scenarios.find(
  (s) => s.id === "prop-heading-level",
) as SingleScenario;
const imageWidth = scenarios.find(
  (s) => s.id === "prop-image-width",
) as SingleScenario;
const imageSource = scenarios.find(
  (s) => s.id === "prop-image-source",
) as SingleScenario;

// Block-level prop change: paragraph's `textAlignment` flips from
// "left" to "center". Text content is unchanged.
test("suggestion mode: change text alignment to center", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "center align" });

  editor.replaceBlocks(editor.document, textAlignment.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("hello world"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  textAlignment.apply(editor);

  await expect
    .poll(
      () =>
        (editor.document[0]?.props as { textAlignment?: string })
          ?.textAlignment,
    )
    .toBe("center");

  await waitForSuggestion(editor);
  const attributeMarks =
    editor.prosemirrorView.dom.querySelectorAll<HTMLElement>(
      "[data-attributes]",
    );
  expect(attributeMarks.length).toBe(1);
  expect(JSON.parse(attributeMarks[0].dataset["attributes"]!)).toEqual({
    textAlignment: { userIds: [], timestamp: null },
  });
  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "prop-change-text-alignment",
  );

  attributeMarks[0].dispatchEvent(
    new MouseEvent("mouseover", { bubbles: true }),
  );
  expect(editor.getExtension(AttributionExtension)!.store.state).toMatchObject({
    modificationType: "attrs",
    attributes: ["textAlignment"],
  });
  await expectVisible(
    screen.getByText(editor.dictionary.suggestion_changes.formatting_change, {
      exact: true,
    }),
  );
  expect(
    getComputedStyle(attributeMarks[0].firstElementChild!.firstElementChild!)
      .backgroundColor,
  ).not.toBe("rgba(0, 0, 0, 0)");
  editor.prosemirrorView.dom.dispatchEvent(
    new MouseEvent("mouseover", { bubbles: true }),
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  expect(editorHtml(editor)).toMatchSnapshot();
});

// Block-level prop change on a heading: bump `level` from 1 to 2.
// The changed block is highlighted as a formatting change.
test("suggestion mode: change heading level from 1 to 2", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "demote heading" });

  editor.replaceBlocks(editor.document, headingLevel.initial);
  await sync();
  await expectVisible(screen.getByTestId("editor-A").getByText("hello world"));

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  headingLevel.apply(editor);

  await expect
    .poll(() => (editor.document[0]?.props as { level?: number })?.level)
    .toBe(2);

  await waitForSuggestion(editor);
  const attributeMarks =
    editor.prosemirrorView.dom.querySelectorAll<HTMLElement>(
      "[data-attributes]",
    );
  expect(attributeMarks.length).toBe(1);
  expect(JSON.parse(attributeMarks[0].dataset["attributes"]!)).toEqual({
    level: { userIds: [], timestamp: null },
  });
  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "prop-change-heading-level",
  );

  attributeMarks[0].dispatchEvent(
    new MouseEvent("mouseover", { bubbles: true }),
  );
  expect(editor.getExtension(AttributionExtension)!.store.state).toMatchObject({
    modificationType: "attrs",
    attributes: ["level"],
  });
  await expectVisible(
    screen.getByText(editor.dictionary.suggestion_changes.formatting_change, {
      exact: true,
    }),
  );
  expect(
    getComputedStyle(attributeMarks[0].firstElementChild!.firstElementChild!)
      .backgroundColor,
  ).not.toBe("rgba(0, 0, 0, 0)");
  editor.prosemirrorView.dom.dispatchEvent(
    new MouseEvent("mouseover", { bubbles: true }),
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  expect(editorHtml(editor)).toMatchSnapshot();
});

// Image block prop change: `previewWidth`. Resizes the image, no
// content/text change.
test("suggestion mode: resize image (previewWidth)", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "resize image" });

  editor.replaceBlocks(editor.document, imageWidth.initial);
  await sync();
  // Default `alt=""` on the image makes it decorative, so
  // `getByRole("img")` doesn't see it. Poll on the prop having
  // landed in the editor instead.
  await expect
    .poll(() => (editor.document[0]?.props as { url?: string })?.url)
    .toBe(IMG_SRC_BASE);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  imageWidth.apply(editor);

  await expect
    .poll(
      () =>
        (editor.document[0]?.props as { previewWidth?: number })?.previewWidth,
    )
    .toBe(400);

  await waitForSuggestion(editor);
  const attributeMarks =
    editor.prosemirrorView.dom.querySelectorAll<HTMLElement>(
      "[data-attributes]",
    );
  expect(attributeMarks.length).toBe(1);
  expect(JSON.parse(attributeMarks[0].dataset["attributes"]!)).toEqual({
    previewWidth: { userIds: [], timestamp: null },
  });
  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "prop-change-image-width",
  );

  attributeMarks[0].dispatchEvent(
    new MouseEvent("mouseover", { bubbles: true }),
  );
  expect(editor.getExtension(AttributionExtension)!.store.state).toMatchObject({
    modificationType: "attrs",
    attributes: ["previewWidth"],
  });
  await expectVisible(
    screen.getByText(editor.dictionary.suggestion_changes.formatting_change, {
      exact: true,
    }),
  );
  expect(
    getComputedStyle(attributeMarks[0].firstElementChild!.firstElementChild!)
      .backgroundColor,
  ).not.toBe("rgba(0, 0, 0, 0)");
  editor.prosemirrorView.dom.dispatchEvent(
    new MouseEvent("mouseover", { bubbles: true }),
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  expect(editorHtml(editor)).toMatchSnapshot();
});

// Image block prop change: `url`. Swaps the image source.
test("suggestion mode: change image source", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "swap image src" });

  editor.replaceBlocks(editor.document, imageSource.initial);
  await sync();
  // Default `alt=""` on the image makes it decorative, so
  // `getByRole("img")` doesn't see it. Poll on the prop having
  // landed in the editor instead.
  await expect
    .poll(() => (editor.document[0]?.props as { url?: string })?.url)
    .toBe(IMG_SRC_BASE);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  imageSource.apply(editor);

  await expect
    .poll(() => (editor.document[0]?.props as { url?: string })?.url)
    .toBe(IMG_SRC_NEW);

  await waitForSuggestion(editor);
  const attributeMarks =
    editor.prosemirrorView.dom.querySelectorAll<HTMLElement>(
      "[data-attributes]",
    );
  expect(attributeMarks.length).toBe(1);
  expect(JSON.parse(attributeMarks[0].dataset["attributes"]!)).toEqual({
    url: { userIds: [], timestamp: null },
  });
  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "prop-change-image-source",
  );

  attributeMarks[0].dispatchEvent(
    new MouseEvent("mouseover", { bubbles: true }),
  );
  expect(editor.getExtension(AttributionExtension)!.store.state).toMatchObject({
    modificationType: "attrs",
    attributes: ["url"],
  });
  await expectVisible(
    screen.getByText(editor.dictionary.suggestion_changes.formatting_change, {
      exact: true,
    }),
  );
  expect(
    getComputedStyle(attributeMarks[0].firstElementChild!.firstElementChild!)
      .backgroundColor,
  ).not.toBe("rgba(0, 0, 0, 0)");
  editor.prosemirrorView.dom.dispatchEvent(
    new MouseEvent("mouseover", { bubbles: true }),
  );

  expect(ydocXml(baseDoc)).toMatchSnapshot();
  expect(ydocXml(suggestionDoc)).toMatchSnapshot();
  expect(editorHtml(editor)).toMatchSnapshot();
});
