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
import "@blocknote/core/style.css";

import { BlockNoteEditor } from "@blocknote/core";
import { withCollaboration } from "@blocknote/core/y";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { Node as PMNode } from "@tiptap/pm/model";
import { Awareness } from "@y/protocols/awareness";
import * as Y from "@y/y";
import { prettify } from "htmlfy";
import { expect } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { page } from "../../../utils/context.js";

export interface SuggestionFixture {
  /** User A's editor – this is the one the test makes suggestions through. */
  editor: BlockNoteEditor;
  /**
   * The `page` locator object (vite-plus browser context). Exposes
   * `getByTestId` / `getByText` for querying the rendered editors. Named
   * `screen` for parity with the testing-library convention the tests use.
   */
  screen: typeof page;
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

  await render(<Editors />);

  return {
    editor: editorA,
    screen: page,
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

/**
 * Pretty-print a Y.Doc's `doc` XmlFragment for an inline snapshot.
 *
 * `Y.XmlFragment.toString()` (and `toJSON()`, which collapses text
 * runs into a bare string) only serialise the element/text structure –
 * inline formatting marks and attribution metadata don't surface, so
 * "hello world" and "hello **world**" produce identical snapshots.
 *
 * Instead we walk the *deep delta* (`toDeltaDeep`), which carries both
 * the per-run `format` (marks like `bold`/`italic`) and `attribution`
 * (suggestion metadata) on every insert op. Those marks are rendered as
 * nested tags (`<bold>world</bold>`) and attribution as an
 * `attribution="..."` attribute so the snapshots actually differ.
 */
export function ydocXml(doc: Y.Doc): string {
  const delta = (doc.get("doc") as any).toDeltaDeep().toJSON();
  return prettify(deltaToXml(delta), { tag_wrap: true });
}

/**
 * A single op from a deep-delta JSON tree. For a final document render
 * only `insert` ops appear (retain/delete are diff artefacts); the
 * insert payload is either a text run (`string`) or an array of nested
 * element deltas. `format` holds inline marks, `attribution` holds
 * suggestion metadata.
 */
interface DeltaJson {
  type?: string;
  name?: string;
  attrs?: Record<string, { type?: string; value?: unknown } | unknown>;
  children?: DeltaInsertOp[];
}

interface DeltaInsertOp {
  type?: string;
  insert?: string | DeltaJson[];
  format?: Record<string, unknown>;
  attribution?: Record<string, unknown>;
}

/** Render a deep-delta JSON node (a `{ type: 'delta', ... }` object). */
function deltaToXml(node: DeltaJson): string {
  let inner = "";
  for (const op of node.children ?? []) {
    inner += opToXml(op);
  }

  if (node.name == null) {
    // The root XmlFragment has no tag of its own – emit its children.
    return inner;
  }
  return `<${node.name}${deltaAttrsToString(node.attrs)}>${inner}</${node.name}>`;
}

/** Render one insert op, applying its `format` marks and `attribution`. */
function opToXml(op: DeltaInsertOp): string {
  let out: string;
  if (typeof op.insert === "string") {
    out = escapeXml(op.insert);
  } else if (Array.isArray(op.insert)) {
    out = op.insert.map(deltaToXml).join("");
  } else {
    out = "";
  }

  // Wrap with inline marks (bold/italic/…). A "trivial" value (`true`
  // or an empty `{}`) renders as a bare tag (`<bold>`); richer values
  // surface as a `value="…"` attribute. Object values (e.g. suggestion
  // format metadata) are JSON-encoded since `String(obj)` throws
  // "Cannot convert object to primitive value".
  //
  // Marks are sorted by name so nesting order is deterministic: YJS
  // delta `format` key order isn't stable (especially after a
  // concurrent merge of two marks), which would otherwise make these
  // snapshots flaky. Sorted ascending => the alphabetically-first mark
  // ends up innermost (e.g. `<italic><bold>world</bold></italic>`).
  for (const [name, value] of Object.entries(op.format ?? {}).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )) {
    const isObject = value !== null && typeof value === "object";
    const isTrivial =
      value === true || (isObject && Object.keys(value).length === 0);
    if (isTrivial) {
      out = `<${name}>${out}</${name}>`;
    } else {
      const rendered = isObject ? JSON.stringify(value) : String(value);
      out = `<${name} value="${escapeXml(rendered)}">${out}</${name}>`;
    }
  }

  // Surface suggestion attribution as a wrapping element so it's visible
  // in the snapshot (and distinct from a plain formatting mark).
  if (op.attribution != null && Object.keys(op.attribution).length > 0) {
    out = `<attribution data="${escapeXml(JSON.stringify(op.attribution))}">${out}</attribution>`;
  }

  return out;
}

/** Format a delta node's `attrs` map (e.g. block-level paragraph props). */
function deltaAttrsToString(attrs: DeltaJson["attrs"] | undefined): string {
  if (attrs == null) {
    return "";
  }
  return Object.entries(attrs)
    .map(([key, raw]) => {
      // attrs are `SetAttrOp` JSON: `{ type: 'insert', value }`.
      const value =
        raw != null && typeof raw === "object" && "value" in raw
          ? (raw as { value: unknown }).value
          : raw;
      const rendered =
        value !== null && typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
      return ` ${key}="${escapeXml(rendered)}"`;
    })
    .sort()
    .join("");
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
