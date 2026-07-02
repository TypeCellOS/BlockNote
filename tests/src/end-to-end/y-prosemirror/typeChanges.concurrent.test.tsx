/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for two-user concurrent type-change
 * suggestions. Same shape as `propChanges.concurrent.test.tsx`.
 */
import { expect, test } from "vite-plus/test";
import { expectScreenshot, expectVisible } from "./fixtures/browserExpect.js";

import { setupConcurrentSuggestionTest } from "./fixtures/concurrentSuggestionFixture.js";
import { editorHtml, ydocXml } from "./fixtures/suggestionFixture.js";

// Scenario data (the `initial` seed + A's/B's `applyA`/`applyB` changes) is
// shared with the suggestion-gallery example so the two never drift.
import { scenarios } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";
import type { ConcurrentScenario } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";

const headingVsList = scenarios.find(
  (s) => s.id === "concurrent-heading-vs-list",
) as ConcurrentScenario;
const textVsHeading = scenarios.find(
  (s) => s.id === "concurrent-text-vs-heading",
) as ConcurrentScenario;

// Two competing type changes on the same block: A wants a heading, B
// wants a list item.
test("concurrent: A → heading, B → list item", async () => {
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
    userAAction: "→ heading",
    userBAction: "→ list item",
  });

  userA.editor.replaceBlocks(userA.editor.document, headingVsList.initial);
  seed();
  await expectVisible(
    screen.getByTestId(userA.testId).getByText("hello world"),
  );

  enableSuggestions();

  headingVsList.applyA(userA.editor);

  headingVsList.applyB(userB.editor);

  // TODO: should this be editor.document[0], or expose .documentWithoutDeletions?
  await expect.poll(() => userA.editor.document[1]?.type).toBe("heading");
  await expect
    .poll(() => userB.editor.document[1]?.type)
    .toBe("bulletListItem");

  sync();

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "concurrent-heading-vs-list",
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
        <heading
          backgroundColor="default"
          isToggleable="false"
          level="1"
          textAlignment="left"
          textColor="default"
        >hello world</heading>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocB)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <bulletListItem
          backgroundColor="default"
          textAlignment="left"
          textColor="default"
        >hello world</bulletListItem>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocMerged)).toMatchInlineSnapshot(`
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
      <blockContainer id="block-hello">
        <bulletListItem
          backgroundColor="default"
          textAlignment="left"
          textColor="default"
        >hello world</bulletListItem>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(merged.editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <y-attributed-delete
          userIds="A"
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="block-hello">
            <paragraph backgroundColor="default" textColor="default" textAlignment="left">hello world</paragraph>
          </blockContainer>
        </y-attributed-delete>
        <y-attributed-insert
          userIds="A"
          user-color-light="#fff0c2"
          user-color-dark="#8a6d1a"
        >
          <blockContainer id="block-hello">
            <y-attributed-insert
              userIds="A"
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
                  userIds="A"
                  user-color-light="#fff0c2"
                  user-color-dark="#8a6d1a"
                >hello world</y-attributed-insert>
              </heading>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
        <y-attributed-insert
          userIds="B"
          user-color-light="#fcc9c3"
          user-color-dark="#8a2e24"
        >
          <blockContainer id="block-hello">
            <y-attributed-insert
              userIds="B"
              user-color-light="#fcc9c3"
              user-color-dark="#8a2e24"
            >
              <bulletListItem
                backgroundColor="default"
                textColor="default"
                textAlignment="left"
              >
                <y-attributed-insert
                  userIds="B"
                  user-color-light="#fcc9c3"
                  user-color-dark="#8a2e24"
                >hello world</y-attributed-insert>
              </bulletListItem>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});

// Mixed: A does a text edit (no type change), B changes the type.
// Exercises the path where one user's suggestion is a regular text
// diff and the other's is a block-type swap.
test("concurrent: A edits text, B → heading", async () => {
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
    userAAction: "world → universe",
    userBAction: "→ heading",
  });

  userA.editor.replaceBlocks(userA.editor.document, textVsHeading.initial);
  seed();
  await expectVisible(
    screen.getByTestId(userA.testId).getByText("hello world"),
  );

  enableSuggestions();

  textVsHeading.applyA(userA.editor);

  textVsHeading.applyB(userB.editor);

  await expect
    .poll(() =>
      userA.editor.prosemirrorState.doc.toString().includes("y-attributed"),
    )
    .toBe(true);
  // TODO: should this be editor.document[0], or expose .documentWithoutDeletions?
  await expect.poll(() => userB.editor.document[1]?.type).toBe("heading");

  sync();

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "concurrent-text-edit-vs-heading",
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
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">hello universe</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocB)).toMatchInlineSnapshot(`
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
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocMerged)).toMatchInlineSnapshot(`
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
    </blockGroup>"
  `);
  expect(editorHtml(merged.editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <y-attributed-delete
          userIds="B"
          user-color-light="#fcc9c3"
          user-color-dark="#8a2e24"
        >
          <blockContainer id="block-hello">
            <y-attributed-delete
              userIds="B"
              user-color-light="#fcc9c3"
              user-color-dark="#8a2e24"
            >
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                <y-attributed-delete
                  userIds="B"
                  user-color-light="#fcc9c3"
                  user-color-dark="#8a2e24"
                >hello</y-attributed-delete>
                <y-attributed-delete
                  userIds="A"
                  user-color-light="#fff0c2"
                  user-color-dark="#8a6d1a"
                >wo</y-attributed-delete>
                <y-attributed-delete
                  userIds="B"
                  user-color-light="#fcc9c3"
                  user-color-dark="#8a2e24"
                >r</y-attributed-delete>
                <y-attributed-delete
                  userIds="A"
                  user-color-light="#fff0c2"
                  user-color-dark="#8a6d1a"
                >ld</y-attributed-delete>
              </paragraph>
            </y-attributed-delete>
          </blockContainer>
        </y-attributed-delete>
        <y-attributed-insert
          userIds="B"
          user-color-light="#fcc9c3"
          user-color-dark="#8a2e24"
        >
          <blockContainer id="block-hello">
            <y-attributed-insert
              userIds="B"
              user-color-light="#fcc9c3"
              user-color-dark="#8a2e24"
            >
              <heading
                backgroundColor="default"
                textColor="default"
                textAlignment="left"
                level="1"
                isToggleable="false"
              >
                <y-attributed-insert
                  userIds="B"
                  user-color-light="#fcc9c3"
                  user-color-dark="#8a2e24"
                >hello world</y-attributed-insert>
              </heading>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
      </blockGroup>
    </doc>"
  `);
});
