/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Vitest browser-mode tests for two-user concurrent suggestion edits.
 * Each test sets up three side-by-side editors (User A, User B,
 * Merged) backed by `baseDoc` + `suggestionDocA`/`B`/`Merged`, applies
 * independent suggestion edits from A and B, calls `sync()` to fan
 * both updates into the merged doc, and snapshots the converged state.
 *
 * TODO: BlockNote's `mapAttributionToMark` (YSync.ts) hashes user IDs
 * from the attribution data to pick a color from a fixed palette, but
 * `Y.Attributions()` ships empty and nothing in the editor pipeline
 * populates it from the editor's `user` / awareness. Result: every
 * mark in every test renders as `userColorPalette[0]` (#30bced),
 * regardless of which user actually made the edit. In the merged
 * snapshots below we therefore cannot tell A's marks from B's. Decide
 * whether the attribution layer should automatically tag writes with
 * the local awareness user, or whether tests should construct an
 * `Attributions` instance with pre-registered client-id → user-id
 * mappings.
 */
import { expect, test } from "vite-plus/test";
import { expectScreenshot, expectVisible } from "./fixtures/browserExpect.js";

import { setupConcurrentSuggestionTest } from "./fixtures/concurrentSuggestionFixture.js";
import {
  editorHtml,
  waitForSuggestion,
  ydocXml,
} from "./fixtures/suggestionFixture.js";

// Concurrent text edits on overlapping range: A fixes a typo while B
// deletes the whole word. After CRDT merge, snapshot what the merged
// editor ends up displaying.
test("concurrent: A fixes typo, B deletes the word", async () => {
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
    userAAction: "fix typo",
    userBAction: "delete word",
  });

  // Seed: A writes "hello wrold" (typo) directly to baseDoc since
  // suggestion mode isn't on yet. Then `seed()` fans baseDoc into
  // all three suggestion docs so everyone starts from the same state.
  userA.editor.replaceBlocks(userA.editor.document, [
    { id: "block-hello", type: "paragraph", content: "hello wrold" },
  ]);
  seed();

  await expectVisible(
    screen.getByTestId(userA.testId).getByText("hello wrold"),
  );

  // Switch all editors into suggestion mode (subsequent edits in A
  // and B are recorded as suggestions, merged starts watching its
  // suggestion doc for incoming updates).
  enableSuggestions();

  // A: fix typo "wrold" -> "world".
  const [blockA] = userA.editor.document;
  userA.editor.updateBlock(blockA, {
    type: "paragraph",
    content: "hello world",
  });

  // B: delete the misspelled word entirely.
  const [blockB] = userB.editor.document;
  userB.editor.updateBlock(blockB, { type: "paragraph", content: "hello " });

  await waitForSuggestion(userA.editor);
  await waitForSuggestion(userB.editor);

  // Merge A's and B's suggestions into the merged doc.
  sync();
  await waitForSuggestion(merged.editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "concurrent-typo-fix-vs-delete",
  );

  // TODO: the merged YDoc ends up at "hello o" – an `o` survives even
  // though both A (who replaced "wrold" with "world") and B (who
  // deleted "wrold" outright) effectively wanted "wrold" gone. The
  // CRDT keeps A's inserted `o` because B's delete-range covered the
  // original "wrold" letters but not A's freshly-inserted characters,
  // so the union of "delete everything B saw" + "keep what A added"
  // leaves a stray `o`. Worth deciding whether this is the desired
  // merge semantic for the product or whether the suggestion layer
  // should resolve overlapping edits differently.
  expect(ydocXml(baseDoc)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">hello wrold</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocA)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">hello world</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocB)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">hello</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocMerged)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">hello o</paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(merged.editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="block-hello">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">
            hello
            <y-attributed-delete
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >w</y-attributed-delete>
            <y-attributed-insert
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >o</y-attributed-insert>
            <y-attributed-delete
              userIds=""
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >rold</y-attributed-delete>
          </paragraph>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});

// Concurrent format edits on the same word: A adds bold, B adds
// italic. After CRDT merge, both marks should land on "world".
test("concurrent: A bolds the word, B italicises the word", async () => {
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
    userAAction: "bold 'world'",
    userBAction: "italicise 'world'",
  });

  // Seed: A writes plain "hello world" directly to baseDoc, then
  // `seed()` fans it into all three suggestion docs.
  userA.editor.replaceBlocks(userA.editor.document, [
    { id: "block-hello", type: "paragraph", content: "hello world" },
  ]);
  seed();

  await expectVisible(
    screen.getByTestId(userA.testId).getByText("hello world"),
  );

  enableSuggestions();

  // A: bold "world".
  const [blockA] = userA.editor.document;
  userA.editor.updateBlock(blockA, {
    type: "paragraph",
    content: [
      { type: "text", text: "hello ", styles: {} },
      { type: "text", text: "world", styles: { bold: true } },
    ],
  });

  // B: italic "world".
  const [blockB] = userB.editor.document;
  userB.editor.updateBlock(blockB, {
    type: "paragraph",
    content: [
      { type: "text", text: "hello ", styles: {} },
      { type: "text", text: "world", styles: { italic: true } },
    ],
  });

  await waitForSuggestion(userA.editor);
  await waitForSuggestion(userB.editor);

  sync();
  await waitForSuggestion(merged.editor);

  await expectScreenshot(
    screen.getByTestId("editor-root"),
    "concurrent-bold-vs-italic",
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
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">
          hello
          <bold>world</bold>
        </paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocB)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">
          hello
          <italic>world</italic>
        </paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(ydocXml(suggestionDocMerged)).toMatchInlineSnapshot(`
    "<blockGroup>
      <blockContainer id="block-hello">
        <paragraph backgroundColor="default" textAlignment="left" textColor="default">
          hello
          <italic>
            <bold>world</bold>
          </italic>
        </paragraph>
      </blockContainer>
    </blockGroup>"
  `);
  expect(editorHtml(merged.editor)).toMatchInlineSnapshot(`
    "<doc>
      <blockGroup>
        <blockContainer id="block-hello">
          <paragraph backgroundColor="default" textColor="default" textAlignment="left">
            hello
            <y-attributed-format
              userIds=""
              format="[object Object]"
              user-color-light="#fff0c2"
              user-color-dark="#8a6d1a"
            >
              <italic>
                <bold>world</bold>
              </italic>
            </y-attributed-format>
          </paragraph>
        </blockContainer>
      </blockGroup>
    </doc>"
  `);
});
