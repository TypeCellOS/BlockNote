/* eslint-disable testing-library/render-result-naming-convention */
/**
 * Shared fixture for browser-mode suggestion tests.
 *
 * Mounts a single BlockNote editor bound to an in-memory `baseDoc`,
 * with a second in-memory `suggestionDoc` set up as the diff target.
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
import { render } from "vitest-browser-react";

export interface SuggestionFixture {
  editor: BlockNoteEditor;
  screen: Awaited<ReturnType<typeof render>>;
  baseDoc: Y.Doc;
  suggestionDoc: Y.Doc;
  /** Replay updates from `baseDoc` into `suggestionDoc`. */
  sync: () => void;
}

export async function setupSuggestionTest(): Promise<SuggestionFixture> {
  const baseDoc = new Y.Doc();
  const baseAwareness = new Awareness(baseDoc);
  baseAwareness.setLocalStateField("user", {
    name: "Author",
    color: "#30bced",
  });

  const suggestionDoc = new Y.Doc({ isSuggestionDoc: true });
  const attributionManager = Y.createAttributionManagerFromDiff(
    baseDoc,
    suggestionDoc,
    { attrs: new Y.Attributions() },
  );
  attributionManager.suggestionMode = true;

  let editor!: BlockNoteEditor;
  function Editor() {
    editor = useCreateBlockNote(
      withCollaboration({
        collaboration: {
          fragment: baseDoc.get("doc"),
          provider: { awareness: baseAwareness },
          suggestionDoc,
          attributionManager,
          user: { name: "Author", color: "#30bced" },
        },
      }),
    );
    return (
      <div data-testid="editor-root" style={{ padding: 16 }}>
        <BlockNoteView editor={editor} />
      </div>
    );
  }

  const screen = await render(<Editor />);

  return {
    editor,
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
  return prettify(doc.get("doc").toString(), { tag_wrap: true });
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
  if (node.isText) {
    let out = escapeXml(node.text ?? "");
    // PM stores marks outermost-first; wrap innermost-first to preserve order.
    for (const mark of node.marks) {
      out = `<${mark.type.name}${formatAttrs(mark.attrs)}>${out}</${mark.type.name}>`;
    }
    return out;
  }
  let inner = "";
  node.content.forEach((child) => {
    inner += pmNodeToXml(child);
  });
  return `<${node.type.name}${formatAttrs(node.attrs)}>${inner}</${node.type.name}>`;
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
