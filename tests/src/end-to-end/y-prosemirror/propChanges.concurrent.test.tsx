/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for two-user concurrent prop-change
 * suggestions. Same shape as `basicText.concurrent.test.tsx` but the
 * edits are block-level prop changes rather than content edits.
 *
 * The "no `y-attributed-*` mark for block-prop changes" known issue (tracked in
 * the suggestion gallery's "Prop changes" scenarios) applies here too.
 */
import { expect, test } from "vite-plus/test";
import { expectScreenshot, expectVisible } from "./fixtures/browserExpect.js";

import { setupConcurrentSuggestionTest } from "./fixtures/concurrentSuggestionFixture.js";
import { editorHtml, ydocXml } from "./fixtures/suggestionFixture.js";

// Scenario data (the `initial` seed + A's/B's `applyA`/`applyB` changes) is
// shared with the suggestion-gallery example so the two never drift.
import { scenarios } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";
import type { ConcurrentScenario } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";

const textColorVsBgColor = scenarios.find(
  (s) => s.id === "concurrent-textcolor-vs-bgcolor",
) as ConcurrentScenario;

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
  userA.editor.replaceBlocks(userA.editor.document, textColorVsBgColor.initial);
  seed();
  await expectVisible(
    screen.getByTestId(userA.testId).getByText("hello world"),
  );

  enableSuggestions();

  // A: change textColor to red.
  textColorVsBgColor.applyA(userA.editor);

  // B: change backgroundColor to yellow.
  textColorVsBgColor.applyB(userB.editor);

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

  await expectScreenshot(
    screen.getByTestId("editor-root"),
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
