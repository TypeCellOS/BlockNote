/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for two-user concurrent nesting
 * suggestions. Same shape as `propChanges.concurrent.test.tsx`.
 */
import { expect, test } from "vitest";

import { setupConcurrentSuggestionTest } from "./fixtures/concurrentSuggestionFixture.js";
import {
  editorHtml,
  waitForSuggestion,
  ydocXml,
} from "./fixtures/suggestionFixture.js";

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
  userA.editor.replaceBlocks(userA.editor.document, [
    { id: "n0", type: "paragraph", content: "N0" },
    { id: "n1", type: "paragraph", content: "N1" },
    { id: "n2", type: "paragraph", content: "N2" },
  ]);
  seed();
  await expect
    .element(screen.getByTestId(userA.testId).getByText("N0"))
    .toBeVisible();

  enableSuggestions();

  // A: nest N1 under N0.
  userA.editor.setTextCursorPosition("n1", "start");
  userA.editor.nestBlock();

  // B: nest N2 under N1 (in B's local view N1 is still a sibling).
  userB.editor.setTextCursorPosition("n2", "start");
  userB.editor.nestBlock();

  await waitForSuggestion(userA.editor);
  await waitForSuggestion(userB.editor);

  sync();
  await waitForSuggestion(merged.editor);

  await expect(screen.getByTestId("editor-root")).toMatchScreenshot(
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
    </blockGroup>"
  `);
  expect(editorHtml(merged.editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="n0">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">N0</paragraph>
          <blockGroup>
            <blockContainer id="n1">
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">N1</paragraph>
            </blockContainer>
          </blockGroup>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});

// Two non-overlapping child inserts under the same parent:
//   A adds N1 as a child of N0;
//   B adds N2 as a child of N0.
//
// KNOWN ISSUE: the CRDT merge result here is non-deterministic across
// runs because it depends on `Y.Doc.clientID` tiebreaking, which is
// randomly generated. Empirically we see two distinct outcomes:
//   - A wins: N1 nested under N0, N2 ends up as a *sibling* of N0
//     with `<y-attributed-insert>` (B's nesting is silently lost);
//   - B wins: N2 nested under N0, plus an auto-injected empty
//     paragraph appears with N1 nested under *that* empty paragraph.
// Both are arguably bugs. We deliberately don't pin clientIDs at the
// fixture level (that would mask this), so the test is skipped until
// upstream merge behaviour is decided/fixed. The inline snapshots
// below preserve the "A wins" variant captured against a pinned-ID
// run, as documentation of one of the two observed outcomes.
test.skip("concurrent: A nests N1 under N0, B nests N2 under N0", async () => {
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
  userA.editor.replaceBlocks(userA.editor.document, [
    { id: "n0", type: "paragraph", content: "N0" },
  ]);
  seed();
  await expect
    .element(screen.getByTestId(userA.testId).getByText("N0"))
    .toBeVisible();

  enableSuggestions();

  // A: insert N1 as sibling of N0, then nest under N0.
  userA.editor.insertBlocks(
    [{ id: "n1", type: "paragraph", content: "N1" }],
    "n0",
    "after",
  );
  userA.editor.setTextCursorPosition("n1", "start");
  userA.editor.nestBlock();

  // B: same shape with N2.
  userB.editor.insertBlocks(
    [{ id: "n2", type: "paragraph", content: "N2" }],
    "n0",
    "after",
  );
  userB.editor.setTextCursorPosition("n2", "start");
  userB.editor.nestBlock();

  await waitForSuggestion(userA.editor);
  await waitForSuggestion(userB.editor);

  sync();
  // Wait until both inserts have actually rendered in the merged
  // column. Waiting on just the PM state (or `waitForSuggestion`)
  // races the React/DOM commit – the screenshot sometimes captures a
  // 100px layout, sometimes 121px.
  await expect
    .element(screen.getByTestId("editor-merged").getByText("N1"))
    .toBeVisible();
  await expect
    .element(screen.getByTestId("editor-merged").getByText("N2"))
    .toBeVisible();

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
      <blockContainer id="n2">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">N2</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  // TODO: the merge is asymmetric – A's N1 lands nested under N0 (as
  // intended), but B's N2 ends up as a *sibling* even though B's local
  // suggestion doc had N2 nested under N0 too. The first-to-nest wins,
  // the second user's nesting is silently lost. If both users see the
  // exact same operation in their local view, we'd expect the merge to
  // preserve both nestings (or at least surface the conflict).
  expect(editorHtml(merged.editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="n0">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">N0</paragraph>
          <blockGroup>
            <blockContainer id="n1">
              <paragraph backgroundColor="default" textColor="default" textAlignment="left">
                <y-attributed-insert user-color="#30bced">N1</y-attributed-insert>
              </paragraph>
            </blockContainer>
          </blockGroup>
        </blockContainer>
        <blockContainer id="n2">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">
            <y-attributed-insert user-color="#30bced">N2</y-attributed-insert>
          </paragraph>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});
