/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Fixture for two-user concurrent suggestion tests.
 *
 * Layout:
 *   ┌──────┬─────────────────────┬─────────────────────┬────────┐
 *   │ Base │ User A: <userAction>│ User B: <userBAction│ Merged │
 *   └──────┴─────────────────────┴─────────────────────┴────────┘
 *
 * Docs:
 *   - `baseDoc`              shared baseline (the "clean" pre-suggestion state)
 *   - `suggestionDocA`       User A's suggestion layer
 *   - `suggestionDocB`       User B's suggestion layer
 *   - `suggestionDocMerged`  receives updates from A and B; this is
 *                            where the CRDT merge actually happens
 *
 * All three editors use `fragment: baseDoc.get("doc")`. After mount
 * the fixture calls `enableSuggestions()` on each one, which switches
 * the y-prosemirror plugin from observing `baseDoc` to observing the
 * editor's own suggestion doc (so updates to `suggestionDocMerged`
 * via `sync()` actually trigger the merged editor to re-render).
 *
 * Tests usually go:
 *   1. seed baseline via A's editor (suggestion mode off → writes go
 *      to `baseDoc`), then `seed()` fans the content into the three
 *      suggestion docs
 *   2. `enableSuggestions()` to switch all editors into suggestion
 *      mode (and to make their plugins observe their suggestion docs)
 *   3. make A's edit, then B's edit
 *   4. `sync()` – fans A's and B's suggestion updates into merged
 *   5. snapshot the merged editor + the four Y.Docs
 */
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "@blocknote/core/style.css";

import { BlockNoteEditor } from "@blocknote/core";
import { SuggestionsExtension, withCollaboration } from "@blocknote/core/y";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { Awareness } from "@y/protocols/awareness";
import * as Y from "@y/y";
import { render } from "vitest-browser-react";
import { page } from "../../../utils/context.js";

export interface ConcurrentSuggestionUser {
  editor: BlockNoteEditor;
  testId: string;
}

export interface ConcurrentSuggestionFixture {
  userA: ConcurrentSuggestionUser;
  userB: ConcurrentSuggestionUser;
  merged: ConcurrentSuggestionUser;
  baseDoc: Y.Doc;
  suggestionDocA: Y.Doc;
  suggestionDocB: Y.Doc;
  suggestionDocMerged: Y.Doc;
  /**
   * The `page` locator object (vite-plus browser context). Exposes
   * `getByTestId` / `getByText` for querying the rendered editors. Named
   * `screen` for parity with the testing-library convention the tests use.
   */
  screen: typeof page;
  /**
   * Replay `baseDoc` into all three suggestion docs. Call after
   * seeding the initial content via A's editor (with suggestion mode
   * off – writes go straight to `baseDoc`) so all four docs start aligned.
   */
  seed: () => void;
  /**
   * Switch all three editors into suggestion mode. Call after `seed()`
   * – subsequent edits in A and B are recorded as suggestions, and the
   * merged editor starts observing `suggestionDocMerged` for updates.
   */
  enableSuggestions: () => void;
  /** Fan A's and B's suggestion updates into `suggestionDocMerged`. */
  sync: () => void;
}

const USER_A = { name: "User A", color: "#30bced" };
const USER_B = { name: "User B", color: "#ee6352" };
const USER_MERGED = { name: "Merged", color: "#888888" };
const USER_BASE = { name: "Base", color: "#888888" };

export interface ConcurrentSuggestionFixtureOptions {
  /** 1-5 word description of what User A does (rendered as column heading). */
  userAAction: string;
  /** 1-5 word description of what User B does (rendered as column heading). */
  userBAction: string;
}

export async function setupConcurrentSuggestionTest({
  userAAction,
  userBAction,
}: ConcurrentSuggestionFixtureOptions): Promise<ConcurrentSuggestionFixture> {
  const baseDoc = new Y.Doc();
  const suggestionDocA = new Y.Doc({ isSuggestionDoc: true });
  const suggestionDocB = new Y.Doc({ isSuggestionDoc: true });
  const suggestionDocMerged = new Y.Doc({ isSuggestionDoc: true });

  // `Y.Doc.clientID` is randomly generated and CRDT tiebreaks on it,
  // so concurrent edits that touch the same logical position can
  // converge to different shapes between runs. We deliberately do
  // NOT pin clientIDs here – any test whose merge result depends on
  // tiebreaking is therefore flaky on purpose, so the underlying
  // non-determinism stays visible. Skip or `.fails`-mark those tests
  // explicitly rather than papering over them.

  const managerA = Y.createAttributionManagerFromDiff(baseDoc, suggestionDocA, {
    attrs: new Y.Attributions(),
  });
  managerA.suggestionMode = true;

  const managerB = Y.createAttributionManagerFromDiff(baseDoc, suggestionDocB, {
    attrs: new Y.Attributions(),
  });
  managerB.suggestionMode = true;

  // Merged is a viewer – it shows both users' suggestions but doesn't
  // record new ones, so `suggestionMode = false`.
  const managerMerged = Y.createAttributionManagerFromDiff(
    baseDoc,
    suggestionDocMerged,
    { attrs: new Y.Attributions() },
  );
  managerMerged.suggestionMode = false;

  const awarenessA = makeAwareness(baseDoc, USER_A);
  const awarenessB = makeAwareness(baseDoc, USER_B);
  const awarenessMerged = makeAwareness(baseDoc, USER_MERGED);

  let editorBase!: BlockNoteEditor;
  let editorA!: BlockNoteEditor;
  let editorB!: BlockNoteEditor;
  let editorMerged!: BlockNoteEditor;

  function Editors() {
    editorBase = useCreateBlockNote(
      withCollaboration({
        collaboration: {
          fragment: baseDoc.get("doc"),
          provider: { awareness: new Awareness(baseDoc) },
          user: USER_BASE,
        },
      }),
    );
    editorA = useCreateBlockNote(
      withCollaboration({
        collaboration: {
          fragment: baseDoc.get("doc"),
          provider: { awareness: awarenessA },
          suggestionDoc: suggestionDocA,
          attributionManager: managerA,
          user: USER_A,
        },
      }),
    );
    editorB = useCreateBlockNote(
      withCollaboration({
        collaboration: {
          fragment: baseDoc.get("doc"),
          provider: { awareness: awarenessB },
          suggestionDoc: suggestionDocB,
          attributionManager: managerB,
          user: USER_B,
        },
      }),
    );
    editorMerged = useCreateBlockNote(
      withCollaboration({
        collaboration: {
          fragment: baseDoc.get("doc"),
          provider: { awareness: awarenessMerged },
          suggestionDoc: suggestionDocMerged,
          attributionManager: managerMerged,
          user: USER_MERGED,
        },
      }),
    );

    return (
      <div
        data-testid="editor-root"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 12,
          padding: 16,
        }}
      >
        <div data-testid="editor-base">
          <strong>Base</strong>
          <BlockNoteView editor={editorBase} editable={false} />
        </div>
        <div data-testid="editor-A">
          <strong>User A: {userAAction}</strong>
          <BlockNoteView editor={editorA} />
        </div>
        <div data-testid="editor-B">
          <strong>User B: {userBAction}</strong>
          <BlockNoteView editor={editorB} />
        </div>
        <div data-testid="editor-merged">
          <strong>Merged</strong>
          <BlockNoteView editor={editorMerged} editable={false} />
        </div>
      </div>
    );
  }

  // Four columns at 1fr each need a wider viewport so the rightmost
  // column doesn't clip BlockNote content.
  await page.viewport(1800, 800);

  await render(<Editors />);

  return {
    userA: { editor: editorA, testId: "editor-A" },
    userB: { editor: editorB, testId: "editor-B" },
    merged: { editor: editorMerged, testId: "editor-merged" },
    baseDoc,
    suggestionDocA,
    suggestionDocB,
    suggestionDocMerged,
    screen: page,
    seed: () => {
      const update = Y.encodeStateAsUpdate(baseDoc);
      Y.applyUpdate(suggestionDocA, update);
      Y.applyUpdate(suggestionDocB, update);
      Y.applyUpdate(suggestionDocMerged, update);
    },
    enableSuggestions: () => {
      editorA.getExtension(SuggestionsExtension)!.enableSuggestions();
      editorB.getExtension(SuggestionsExtension)!.enableSuggestions();
      editorMerged.getExtension(SuggestionsExtension)!.enableSuggestions();
    },
    sync: () => {
      Y.applyUpdate(suggestionDocMerged, Y.encodeStateAsUpdate(suggestionDocA));
      Y.applyUpdate(suggestionDocMerged, Y.encodeStateAsUpdate(suggestionDocB));
    },
  };
}

function makeAwareness(
  doc: Y.Doc,
  user: { name: string; color: string },
): Awareness {
  const a = new Awareness(doc);
  a.setLocalStateField("user", user);
  return a;
}
