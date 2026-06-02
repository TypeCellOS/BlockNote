/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for prop-change suggestions: block-level
 * attribute edits (text alignment, heading level, image width / source,
 * etc.) rather than content/text edits. Each test follows the same
 * shape as `basicText.test.tsx`: seed, enable suggestions, edit, then
 * screenshot + inline snapshots of base/suggestion docs + PM doc.
 */
import { SuggestionsExtension } from "@blocknote/core/y";
import { expect, test } from "vitest";

import {
  editorHtml,
  setupSuggestionTest,
  ydocXml,
} from "./fixtures/suggestionFixture.js";

// Tiny inline SVG data URLs – avoids a network fetch (placehold.co
// occasionally returns after the screenshot is taken).
const IMG_SRC_BASE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23ff6b6b'/></svg>";
const IMG_SRC_NEW =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%234ecdc4'/></svg>";

// TODO: block-level prop changes generate NO `y-attributed-*` mark in
// the editor's PM doc – the suggestion doc carries the new value but
// the editor shows it as if it were already accepted. Compare with the
// inline-format case in `basicText.test.tsx` which at least produces a
// `y-attributed-format` mark (still no visual style, but at least
// detectable from the data). Decide whether block-prop suggestions
// should also be wrapped in a `y-attributed-format` (or similar) so
// reviewers / accept-reject UI can target them.
//
// Block-level prop change: paragraph's `textAlignment` flips from
// "left" to "center". Text content is unchanged.
test("suggestion mode: change text alignment to center", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "center align" });

  editor.replaceBlocks(editor.document, [
    { id: "block-hello", type: "paragraph", content: "hello world" },
  ]);
  sync();
  await expect
    .element(screen.getByTestId("editor-A").getByText("hello world"))
    .toBeVisible();

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  const [block] = editor.document;
  editor.updateBlock(block, {
    type: "paragraph",
    props: { textAlignment: "center" },
  });

  // Prop changes don't generate `y-attributed-*` marks, so the
  // `waitForSuggestion` helper used elsewhere is too narrow here.
  // Poll on the editor's view of the prop instead.
  await expect
    .poll(() => (editor.document[0]?.props as { textAlignment?: string })?.textAlignment)
    .toBe("center");

  await expect(screen.getByTestId("editor-root")).toMatchScreenshot(
    "prop-change-text-alignment",
  );

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">hello world</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="default" textAlignment="center" textColor="default">hello world</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="block-hello">
          <paragraph backgroundColor="default" textColor="default" textAlignment="center">hello world</paragraph>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});

// Block-level prop change on a heading: bump `level` from 1 to 2.
// Same lack of attribution as the alignment case.
test("suggestion mode: change heading level from 1 to 2", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "demote heading" });

  editor.replaceBlocks(editor.document, [
    {
      id: "block-hello",
      type: "heading",
      props: { level: 1 },
      content: "hello world",
    },
  ]);
  sync();
  await expect
    .element(screen.getByTestId("editor-A").getByText("hello world"))
    .toBeVisible();

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  const [block] = editor.document;
  editor.updateBlock(block, {
    type: "heading",
    props: { level: 2 },
  });

  await expect
    .poll(() => (editor.document[0]?.props as { level?: number })?.level)
    .toBe(2);

  await expect(screen.getByTestId("editor-root")).toMatchScreenshot(
    "prop-change-heading-level",
  );

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <heading
          backgroundColor="default"
          isToggleable="false"
          level="1"
          textAlignment="left"
          textColor="default"
        >hello world</heading>
      </blockContainer>
      <blockContainer id="1">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default"></paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <heading
          backgroundColor="default"
          isToggleable="false"
          level="2"
          textAlignment="left"
          textColor="default"
        >hello world</heading>
      </blockContainer>
      <blockContainer id="1">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default"></paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="block-hello">
          <heading
            backgroundColor="default"
            textColor="default"
            textAlignment="left"
            level="2"
            isToggleable="false"
          >hello world</heading>
        </blockContainer>
        <blockContainer id="1">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left"></paragraph>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});

// Image block prop change: `previewWidth`. Resizes the image, no
// content/text change.
test("suggestion mode: resize image (previewWidth)", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "resize image" });

  editor.replaceBlocks(editor.document, [
    {
      id: "block-image",
      type: "image",
      props: {
        url: IMG_SRC_BASE,
        previewWidth: 200,
      },
    },
  ]);
  sync();
  // Default `alt=""` on the image makes it decorative, so
  // `getByRole("img")` doesn't see it. Poll on the prop having
  // landed in the editor instead.
  await expect
    .poll(() => (editor.document[0]?.props as { url?: string })?.url)
    .toBe(IMG_SRC_BASE);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  const [block] = editor.document;
  editor.updateBlock(block, {
    type: "image",
    props: { previewWidth: 400 },
  });

  await expect
    .poll(
      () =>
        (editor.document[0]?.props as { previewWidth?: number })?.previewWidth,
    )
    .toBe(400);

  await expect(screen.getByTestId("editor-root")).toMatchScreenshot(
    "prop-change-image-width",
  );

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-image">
        <image
          backgroundColor="default"
          caption=""
          name=""
          previewWidth="200"
          showPreview="true"
          textAlignment="left"
          url
          xmlns
          width
          height
        ="data:image/svg+xml;utf8,<svg
          <rect width='100' height='100' fill='%23ff6b6b'></rect>
        </svg>
        " />
    </blockContainer>
    <blockContainer id="1">
      <paragraph backgroundColor="default" textAlignment="left" textColor="default"></paragraph>
    </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-image">
        <image
          backgroundColor="default"
          caption=""
          name=""
          previewWidth="400"
          showPreview="true"
          textAlignment="left"
          url
          xmlns
          width
          height
        ="data:image/svg+xml;utf8,<svg
          <rect width='100' height='100' fill='%23ff6b6b'></rect>
        </svg>
        " />
    </blockContainer>
    <blockContainer id="1">
      <paragraph backgroundColor="default" textAlignment="left" textColor="default"></paragraph>
    </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="block-image">
          <image
            textAlignment="left"
            backgroundColor="default"
            name=""
            url="data:image/svg+xml;utf8,&lt;svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'&gt;&lt;rect width='100' height='100' fill='%23ff6b6b'/&gt;&lt;/svg&gt;"
            caption=""
            showPreview="true"
            previewWidth="400"
          ></image>
        </blockContainer>
        <blockContainer id="1">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left"></paragraph>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});

// Image block prop change: `url`. Swaps the image source.
test("suggestion mode: change image source", async () => {
  const { editor, screen, baseDoc, suggestionDoc, sync } =
    await setupSuggestionTest({ userAction: "swap image src" });

  editor.replaceBlocks(editor.document, [
    {
      id: "block-image",
      type: "image",
      props: {
        url: IMG_SRC_BASE,
        previewWidth: 200,
      },
    },
  ]);
  sync();
  // Default `alt=""` on the image makes it decorative, so
  // `getByRole("img")` doesn't see it. Poll on the prop having
  // landed in the editor instead.
  await expect
    .poll(() => (editor.document[0]?.props as { url?: string })?.url)
    .toBe(IMG_SRC_BASE);

  editor.getExtension(SuggestionsExtension)!.enableSuggestions();

  const [block] = editor.document;
  editor.updateBlock(block, {
    type: "image",
    props: { url: IMG_SRC_NEW },
  });

  await expect
    .poll(() => (editor.document[0]?.props as { url?: string })?.url)
    .toBe(IMG_SRC_NEW);

  await expect(screen.getByTestId("editor-root")).toMatchScreenshot(
    "prop-change-image-source",
  );

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-image">
        <image
          backgroundColor="default"
          caption=""
          name=""
          previewWidth="200"
          showPreview="true"
          textAlignment="left"
          url
          xmlns
          width
          height
        ="data:image/svg+xml;utf8,<svg
          <rect width='100' height='100' fill='%23ff6b6b'></rect>
        </svg>
        " />
    </blockContainer>
    <blockContainer id="1">
      <paragraph backgroundColor="default" textAlignment="left" textColor="default"></paragraph>
    </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-image">
        <image
          backgroundColor="default"
          caption=""
          name=""
          previewWidth="200"
          showPreview="true"
          textAlignment="left"
          url
          xmlns
          width
          height
        ="data:image/svg+xml;utf8,<svg
          <rect width='100' height='100' fill='%234ecdc4'></rect>
        </svg>
        " />
    </blockContainer>
    <blockContainer id="1">
      <paragraph backgroundColor="default" textAlignment="left" textColor="default"></paragraph>
    </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="block-image">
          <image
            textAlignment="left"
            backgroundColor="default"
            name=""
            url="data:image/svg+xml;utf8,&lt;svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'&gt;&lt;rect width='100' height='100' fill='%234ecdc4'/&gt;&lt;/svg&gt;"
            caption=""
            showPreview="true"
            previewWidth="200"
          ></image>
        </blockContainer>
        <blockContainer id="1">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left"></paragraph>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});
