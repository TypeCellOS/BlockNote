/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for two-user concurrent prop-change
 * suggestions. Same shape as `basicText.concurrent.test.tsx` but the
 * edits are block-level prop changes rather than content edits.
 *
 * See `propChanges.test.tsx` for the TODO on prop changes producing no
 * `y-attributed-*` mark – the same applies here.
 */
import { expect, test } from "vitest";

import { setupConcurrentSuggestionTest } from "./fixtures/concurrentSuggestionFixture.js";
import {
  editorHtml,
  ydocXml,
} from "./fixtures/suggestionFixture.js";

// Two users edit independent props on the same block: A changes
// `textColor`, B changes `backgroundColor`. Neither edit touches the
// other's prop, so the CRDT merge should preserve both.
test("concurrent: A changes textColor, B changes backgroundColor", async () => {
  const {
    userA,
    userB,
    merged,
    baseDoc,
    suggestionDocA,
    suggestionDocB,
    suggestionDocMerged,
    screen,
    seed,
    enableSuggestions,
    sync,
  } = await setupConcurrentSuggestionTest({
    userAAction: "red text",
    userBAction: "yellow background",
  });

  // Seed: plain "hello world" with default colors.
  userA.editor.replaceBlocks(userA.editor.document, [
    { id: "block-hello", type: "paragraph", content: "hello world" },
  ]);
  seed();
  await expect
    .element(screen.getByTestId(userA.testId).getByText("hello world"))
    .toBeVisible();

  enableSuggestions();

  // A: change textColor to red.
  const [blockA] = userA.editor.document;
  userA.editor.updateBlock(blockA, {
    type: "paragraph",
    props: { textColor: "red" },
  });

  // B: change backgroundColor to yellow.
  const [blockB] = userB.editor.document;
  userB.editor.updateBlock(blockB, {
    type: "paragraph",
    props: { backgroundColor: "yellow" },
  });

  // Prop changes don't generate y-attributed marks, so we poll on the
  // individual editor doc states instead.
  type ColorProps = { textColor?: string; backgroundColor?: string };
  await expect
    .poll(() => (userA.editor.document[0]?.props as ColorProps)?.textColor)
    .toBe("red");
  await expect
    .poll(
      () => (userB.editor.document[0]?.props as ColorProps)?.backgroundColor,
    )
    .toBe("yellow");

  sync();

  await expect
    .poll(() => (merged.editor.document[0]?.props as ColorProps)?.textColor)
    .toBe("red");
  await expect
    .poll(
      () => (merged.editor.document[0]?.props as ColorProps)?.backgroundColor,
    )
    .toBe("yellow");

  await expect(screen.getByTestId("editor-root")).toMatchScreenshot(
    "concurrent-textColor-vs-backgroundColor",
  );

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">hello world</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocA)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="default" textAlignment="left" textColor="red">hello world</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocB)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="yellow" textAlignment="left" textColor="default">hello world</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocMerged)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="yellow" textAlignment="left" textColor="red">hello world</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(merged.editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="block-hello">
          <paragraph backgroundColor="yellow" textColor="red" textAlignment="left">hello world</paragraph>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});
