/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Shared fixture for browser-mode suggestion tests.
 *
 * Layout:
 *   ┌──────────┬──────────────────────┐
 *   │ Base     │ User A: <userAction> │
 *   └──────────┴──────────────────────┘
 *
 * - `Base` is a read-only editor bound to `baseDoc` – it shows the
 *   pre-suggestion state and is visible in the screenshot so the
 *   reviewer can see the "before" without leaving the file.
 * - `User A` is the suggesting editor. Its column heading includes a
 *   short caller-supplied action description so the screenshot is
 *   self-explanatory.
 *
 * The provider/yhub round-trip is replaced by a manual `sync()`.
 */
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { BlockNoteEditor } from "@blocknote/core";
import { withCollaboration } from "@blocknote/core/y";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { Node as PMNode } from "@tiptap/pm/model";
import { Awareness } from "@y/protocols/awareness";
import * as Y from "@y/y";
import { prettify } from "htmlfy";
import { expect } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

export interface SuggestionFixture {
  /** User A's editor – this is the one the test makes suggestions through. */
  editor: BlockNoteEditor;
  screen: Awaited<ReturnType<typeof render>>;
  baseDoc: Y.Doc;
  suggestionDoc: Y.Doc;
  /** Replay updates from `baseDoc` into `suggestionDoc`. */
  sync: () => void;
}

export interface SuggestionFixtureOptions {
  /**
   * 1-5 word description of what User A does (e.g. "fix typo",
   * "bold world"). Rendered in the User A column heading so the
   * screenshot is self-explanatory.
   */
  userAction: string;
}

export async function setupSuggestionTest({
  userAction,
}: SuggestionFixtureOptions): Promise<SuggestionFixture> {
  const baseDoc = new Y.Doc();
  const baseAwareness = new Awareness(baseDoc);
  baseAwareness.setLocalStateField("user", {
    name: "User A",
    color: "#30bced",
  });

  const suggestionDoc = new Y.Doc({ isSuggestionDoc: true });
  const attributionManager = Y.createAttributionManagerFromDiff(
    baseDoc,
    suggestionDoc,
    { attrs: new Y.Attributions() },
  );
  attributionManager.suggestionMode = true;

  let editorA!: BlockNoteEditor;
  let editorBase!: BlockNoteEditor;

  function Editors() {
    editorA = useCreateBlockNote(
      withCollaboration({
        collaboration: {
          fragment: baseDoc.get("doc"),
          provider: { awareness: baseAwareness },
          suggestionDoc,
          attributionManager,
          user: { name: "User A", color: "#30bced" },
        },
      }),
    );
    editorBase = useCreateBlockNote(
      withCollaboration({
        collaboration: {
          fragment: baseDoc.get("doc"),
          provider: { awareness: new Awareness(baseDoc) },
          user: { name: "Base", color: "#888888" },
        },
      }),
    );
    return (
      <div
        data-testid="editor-root"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          padding: 16,
        }}
      >
        <div data-testid="editor-base">
          <strong>Base</strong>
          <BlockNoteView editor={editorBase} editable={false} />
        </div>
        <div data-testid="editor-A">
          <strong>User A: {userAction}</strong>
          <BlockNoteView editor={editorA} />
        </div>
      </div>
    );
  }

  await page.viewport(1200, 800);

  const screen = await render(<Editors />);

  return {
    editor: editorA,
    screen,
    baseDoc,
    suggestionDoc,
    sync: () => Y.applyUpdate(suggestionDoc, Y.encodeStateAsUpdate(baseDoc)),
  };
}

/**
 * Wait until any suggestion mark (`y-attributed-insert` /
 * `y-attributed-delete`) is present in the editor's PM doc. Use this
 * after a suggestion-mode edit before snapshotting/screenshotting –
 * the PM transaction is sync but the React/DOM commit is not.
 *
 * For tests whose edit changes visible text, prefer waiting on the
 * inserted text via `expect.element(getByText(...))` – it's more
 * meaningful.
 */
export async function waitForSuggestion(
  editor: BlockNoteEditor,
): Promise<void> {
  await expect
    .poll(() => editor.prosemirrorState.doc.toString().includes("y-attributed"))
    .toBe(true);
}

/** Pretty-print a Y.Doc's `doc` XmlFragment for an inline snapshot. */
export function ydocXml(doc: Y.Doc): string {
  // `Y.XmlFragment.toString()` emits HTML5-style unquoted attributes
  // for non-string values (e.g. `level=1`, `isToggleable=false`).
  // htmlfy mangles those, so we wrap each unquoted value in quotes
  // before pretty-printing.
  const raw = doc
    .get("doc")
    .toString()
    .replace(
      /(\w[\w-]*)=([^"'\s>]+)/g,
      (_, name, value) => `${name}="${value}"`,
    );
  return prettify(raw, { tag_wrap: true });
}

/**
 * Pretty-print the editor's ProseMirror doc for an inline snapshot.
 *
 * We walk the node tree directly rather than going through
 * `DOMSerializer` (BlockNote's `renderHTML` adds CSS scaffolding that
 * we don't want in snapshots) or `Node.toString()` (drops attrs, so
 * block ids and suggestion-mark colors would disappear).
 */
export function editorHtml(editor: BlockNoteEditor): string {
  return prettify(pmNodeToXml(editor.prosemirrorState.doc), {
    tag_wrap: true,
  });
}

function pmNodeToXml(node: PMNode): string {
  let out: string;
  if (node.isText) {
    out = escapeXml(node.text ?? "");
  } else {
    let inner = "";
    node.content.forEach((child) => {
      inner += pmNodeToXml(child);
    });
    out = `<${node.type.name}${formatAttrs(node.attrs)}>${inner}</${node.type.name}>`;
  }
  // PM stores marks outermost-first; wrap innermost-first to preserve order.
  // Non-text nodes can also carry marks (used by y-prosemirror for
  // block-level attributions), so this applies to both branches.
  for (const mark of node.marks) {
    out = `<${mark.type.name}${formatAttrs(mark.attrs)}>${out}</${mark.type.name}>`;
  }
  return out;
}

function formatAttrs(attrs: Record<string, unknown>): string {
  return Object.entries(attrs)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => ` ${k}="${escapeXml(String(v))}"`)
    .join("");
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
