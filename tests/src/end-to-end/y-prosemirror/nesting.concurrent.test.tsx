/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for two-user concurrent nesting
 * suggestions. Same shape as `propChanges.concurrent.test.tsx`.
 */
import { expect, test } from "vite-plus/test";
import { expectScreenshot, expectVisible } from "./fixtures/browserExpect.js";

import { setupConcurrentSuggestionTest } from "./fixtures/concurrentSuggestionFixture.js";
import {
  editorHtml,
  waitForSuggestion,
  ydocXml,
} from "./fixtures/suggestionFixture.js";

// Scenario data (the `initial` seed + A's/B's `applyA`/`applyB` changes) is
// shared with the suggestion-gallery example so the two never drift.
import type { ConcurrentScenario } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";
import { scenarios } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";

const indentCascade = scenarios.find(
  (s) => s.id === "concurrent-indent-cascade",
) as ConcurrentScenario;
const nestBothUnderN0 = scenarios.find(
  (s) => s.id === "concurrent-nest-both-under-n0",
) as ConcurrentScenario;

// Two cascading indents from a flat list of three siblings:
//   A nests N1 under N0;
//   B nests N2 under N1.
// The merge converges with A's nesting winning (N1 under N0) and
// B's nesting of N2 dropped, captured in the snapshots below.
test("concurrent: A indents N1, B indents N2 below N1", async () => {
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
    // Keep node names out of the action labels – `getByText` below
    // would otherwise match the column heading and trigger a
    // strict-mode locator violation.
    userAAction: "indent middle block",
    userBAction: "indent last block",
  });

  // Base: three siblings.
  userA.editor.replaceBlocks(userA.editor.document, indentCascade.initial);
  seed();
  await expectVisible(screen.getByTestId(userA.testId).getByText("N0"));

  enableSuggestions();

  // A: nest N1 under N0.
  indentCascade.applyA(userA.editor);

  // B: nest N2 under N1 (in B's local view N1 is still a sibling).
  indentCascade.applyB(userB.editor);

  await waitForSuggestion(userA.editor);
  await waitForSuggestion(userB.editor);

  sync();
  await waitForSuggestion(merged.editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "concurrent-indent-cascade",
  );

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="n0">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N0</paragraph>
      </blockContainer>
      <blockContainer id="n1">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N1</paragraph>
      </blockContainer>
      <blockContainer id="n2">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N2</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocA)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="n0">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N0</paragraph>
        <blockGroup>
          <blockContainer id="n1">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">N1</paragraph>
          </blockContainer>
        </blockGroup>
      </blockContainer>
      <blockContainer id="n2">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N2</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocB)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="n0">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N0</paragraph>
      </blockContainer>
      <blockContainer id="n1">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N1</paragraph>
        <blockGroup>
          <blockContainer id="n2">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">N2</paragraph>
          </blockContainer>
        </blockGroup>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocMerged)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="n0">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N0</paragraph>
        <blockGroup>
          <blockContainer id="n1">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">N1</paragraph>
          </blockContainer>
        </blockGroup>
      </blockContainer>
      <blockContainer id="n1">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N1</paragraph>
        <blockGroup>
          <blockContainer id="n2">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">N2</paragraph>
          </blockContainer>
        </blockGroup>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(merged.editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <y-attributed-delete userIds="A">
          <blockContainer id="n0">
            <paragraph backgroundColor="default" textColor="default" textAlignment="left">N0</paragraph>
          </blockContainer>
        </y-attributed-delete>
        <y-attributed-delete userIds="A">
          <blockContainer id="n1">
            <paragraph backgroundColor="default" textColor="default" textAlignment="left">N1</paragraph>
          </blockContainer>
        </y-attributed-delete>
        <y-attributed-insert userIds="A">
          <blockContainer id="n0">
            <y-attributed-insert userIds="A">
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                <y-attributed-insert userIds="A">N0</y-attributed-insert>
              </paragraph>
            </y-attributed-insert>
            <y-attributed-insert userIds="A">
              <blockGroup>
                <y-attributed-insert userIds="A">
                  <blockContainer id="n1">
                    <y-attributed-insert userIds="A">
                      <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                        <y-attributed-insert userIds="A">N1</y-attributed-insert>
                      </paragraph>
                    </y-attributed-insert>
                  </blockContainer>
                </y-attributed-insert>
              </blockGroup>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
        <y-attributed-delete userIds="B">
          <blockContainer id="n2">
            <y-attributed-delete userIds="B">
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                <y-attributed-delete userIds="B">N2</y-attributed-delete>
              </paragraph>
            </y-attributed-delete>
          </blockContainer>
        </y-attributed-delete>
        <y-attributed-insert userIds="B">
          <blockContainer id="n1">
            <y-attributed-insert userIds="B">
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                <y-attributed-insert userIds="B">N1</y-attributed-insert>
              </paragraph>
            </y-attributed-insert>
            <y-attributed-insert userIds="B">
              <blockGroup>
                <y-attributed-insert userIds="B">
                  <blockContainer id="n2">
                    <y-attributed-insert userIds="B">
                      <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                        <y-attributed-insert userIds="B">N2</y-attributed-insert>
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

// Two non-overlapping child inserts under the same parent:
//   A adds N1 as a child of N0;
//   B adds N2 as a child of N0.
//
// This was previously skipped as non-deterministic — the merge dropped one
// user's nesting depending on the `Y.Doc.clientID` tiebreak. With the
// `blockMatchNodes` nesting check the merge is now clientID-independent: N0 is
// duplicated so both A's and B's nestings survive (see the "concurrent-nest-
// both-under-n0" note in the suggestion gallery). We deliberately still don't
// pin clientIDs at the fixture level — verified stable across repeated unpinned
// runs, so the converged snapshots below hold regardless of tiebreak.
test("concurrent: A nests N1 under N0, B nests N2 under N0", async () => {
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
    userAAction: "add child N1",
    userBAction: "add child N2",
  });

  // Base: single block N0.
  userA.editor.replaceBlocks(userA.editor.document, nestBothUnderN0.initial);
  seed();
  await expectVisible(screen.getByTestId(userA.testId).getByText("N0"));

  enableSuggestions();

  // A: insert N1 as sibling of N0, then nest under N0.
  nestBothUnderN0.applyA(userA.editor);

  // B: same shape with N2.
  nestBothUnderN0.applyB(userB.editor);

  await waitForSuggestion(userA.editor);
  await waitForSuggestion(userB.editor);

  sync();
  // Wait until both inserts have actually rendered in the merged
  // column. Waiting on just the PM state (or `waitForSuggestion`)
  // races the React/DOM commit – the screenshot sometimes captures a
  // 100px layout, sometimes 121px.
  await expectVisible(screen.getByTestId("editor-merged").getByText("N1"));
  await expectVisible(screen.getByTestId("editor-merged").getByText("N2"));

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "concurrent-nest-both-under-n0",
  );

  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="n0">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N0</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocA)).toMatchInlineSnapshot(`
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
  expect(ydocXml(suggestionDocB)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="n0">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N0</paragraph>
        <blockGroup>
          <blockContainer id="n2">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">N2</paragraph>
          </blockContainer>
        </blockGroup>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocMerged)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="n0">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N0</paragraph>
        <blockGroup>
          <blockContainer id="n1">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">N1</paragraph>
          </blockContainer>
        </blockGroup>
      </blockContainer>
      <blockContainer id="n0">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N0</paragraph>
        <blockGroup>
          <blockContainer id="n2">
            <paragraph backgroundColor="default" textAlignment="left" textColor="default">N2</paragraph>
          </blockContainer>
        </blockGroup>
      </blockContainer>
    </blockGroup>"
  `);
  // The asymmetric merge below (A's N1 nests, B's N2 lands as a sibling) is the
  // known issue tracked in the gallery ("concurrent-nest-both-under-n0").
  expect(editorHtml(merged.editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <y-attributed-delete userIds="A">
          <blockContainer id="n0">
            <paragraph backgroundColor="default" textColor="default" textAlignment="left">N0</paragraph>
          </blockContainer>
        </y-attributed-delete>
        <y-attributed-insert userIds="A">
          <blockContainer id="n0">
            <y-attributed-insert userIds="A">
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                <y-attributed-insert userIds="A">N0</y-attributed-insert>
              </paragraph>
            </y-attributed-insert>
            <y-attributed-insert userIds="A">
              <blockGroup>
                <y-attributed-insert userIds="A">
                  <blockContainer id="n1">
                    <y-attributed-insert userIds="A">
                      <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                        <y-attributed-insert userIds="A">N1</y-attributed-insert>
                      </paragraph>
                    </y-attributed-insert>
                  </blockContainer>
                </y-attributed-insert>
              </blockGroup>
            </y-attributed-insert>
          </blockContainer>
        </y-attributed-insert>
        <y-attributed-insert userIds="B">
          <blockContainer id="n0">
            <y-attributed-insert userIds="B">
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                <y-attributed-insert userIds="B">N0</y-attributed-insert>
              </paragraph>
            </y-attributed-insert>
            <y-attributed-insert userIds="B">
              <blockGroup>
                <y-attributed-insert userIds="B">
                  <blockContainer id="n2">
                    <y-attributed-insert userIds="B">
                      <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                        <y-attributed-insert userIds="B">N2</y-attributed-insert>
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
