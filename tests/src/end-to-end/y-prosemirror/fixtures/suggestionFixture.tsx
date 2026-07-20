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

import {
  gallerySchema,
  type GalleryEditor,
} from "@examples/07-collaboration/14-suggestion-gallery/src/gallerySchema";
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
  editor: GalleryEditor;
  /**
   * The `page` locator object (vite-plus browser context). Exposes
   * `getByTestId` / `getByText` for querying the rendered editors. Named
   * `screen` for parity with the testing-library convention the tests use.
   */
  screen: typeof page;
  baseDoc: Y.Doc;
  suggestionDoc: Y.Doc;
  /**
   * Replay updates from `baseDoc` into `suggestionDoc`.
   *
   * `replaceBlocks`/`insertBlocks` dispatch a ProseMirror transaction
   * whose changes are flushed into the bound `baseDoc` by the
   * y-prosemirror `ySyncPlugin` *after* the transaction is applied to
   * the view – this flush is not guaranteed to have happened by the
   * time the caller reaches the next synchronous statement. Encoding
   * `baseDoc`'s state too early would copy the stale (empty) initial
   * doc into `suggestionDoc`, so `sync` waits for `baseDoc` to reflect
   * the editor's current document before replaying the update.
   */
  sync: () => Promise<void>;
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
  // Fixed clientIDs so the snapshots are deterministic. Yjs assigns a
  // random clientID to every `Y.Doc`, and that clientID is used to break
  // ties when ordering concurrent items — so a random clientID makes the
  // item order (and therefore the `toDeltaDeep` output and the diff the
  // renderer computes) differ from run to run, flip-flopping the inline
  // snapshots. Pinning both docs to stable clientIDs removes that source
  // of non-determinism.
  const baseDoc = new Y.Doc();
  baseDoc.clientID = 1;
  const baseAwareness = new Awareness(baseDoc);
  baseAwareness.setLocalStateField("user", {
    name: "User A",
    color: "#30bced",
  });

  const suggestionDoc = new Y.Doc({ isSuggestionDoc: true });
  suggestionDoc.clientID = 2;
  const renderer = Y.createDiffRenderer(baseDoc, suggestionDoc, {
    attrs: new Y.Attributions(),
  });
  renderer.suggestionMode = true;

  let editorA!: GalleryEditor;
  let editorBase!: GalleryEditor;

  function Editors() {
    editorA = useCreateBlockNote(
      withCollaboration({
        schema: gallerySchema,
        collaboration: {
          fragment: baseDoc.get("doc"),
          provider: { awareness: baseAwareness },
          suggestionDoc,
          renderer,
          user: { name: "User A", color: "#30bced" },
        },
      }),
    );
    editorBase = useCreateBlockNote(
      withCollaboration({
        schema: gallerySchema,
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
    sync: async () => {
      // Wait for the y-prosemirror binding to have flushed the editor's
      // latest transaction into `baseDoc` before replaying it, otherwise
      // we copy a stale doc into `suggestionDoc` (see SuggestionFixture
      // `sync` docs).
      await waitForYDocSync(editorA, baseDoc);
      Y.applyUpdate(suggestionDoc, Y.encodeStateAsUpdate(baseDoc));
    },
  };
}

/**
 * Count every block in a (possibly nested) BlockNote document tree.
 */
function countBlocks(blocks: { children?: unknown[] }[]): number {
  let total = 0;
  for (const block of blocks) {
    total += 1;
    const children = block.children as { children?: unknown[] }[] | undefined;
    if (children && children.length > 0) {
      total += countBlocks(children);
    }
  }
  return total;
}

/**
 * Wait until a `baseDoc` bound to `editor` reflects the editor's current
 * document. The y-prosemirror `ySyncPlugin` flushes ProseMirror changes
 * into the Y.Doc asynchronously (after the view applies the
 * transaction), so reading/encoding `baseDoc` immediately after a
 * `replaceBlocks`/`insertBlocks` call can observe the stale initial doc.
 *
 * We match on the number of block nodes — `blockContainer` plus the
 * multi-column `columnList` / `column` nodes, which serialise as their own
 * elements rather than `blockContainer`s (the `<column` prefix matches both).
 * The binding flushes a whole transaction atomically, so once the block count
 * matches the editor's document the structural content has been written.
 */
export async function waitForYDocSync(
  editor: GalleryEditor,
  baseDoc: Y.Doc,
): Promise<void> {
  const expected = countBlocks(editor.document as { children?: unknown[] }[]);
  await expect
    .poll(() => {
      // `XmlFragment` isn't exported from `@y/y` v14's types, so cast to
      // `any` to reach `.toString()` (matches `ydocXml` below).
      const xml = (baseDoc.get("doc") as any).toString();
      const matches = xml.match(/<(?:blockContainer|column)/g);
      return matches ? matches.length : 0;
    })
    .toBe(expected);
}

/**
 * Wait until the editor's PM doc has *settled* after a suggestion-mode edit,
 * i.e. a suggestion mark (`y-attributed-insert` / `y-attributed-delete`) is
 * present AND the serialised doc has stopped changing. Use this after a
 * suggestion-mode edit before snapshotting/screenshotting.
 *
 * Why a settle gate and not just "first appearance": as of @y/prosemirror
 * v2.0.0-6 the RDT sync applies the suggestion decorations asynchronously and
 * can apply-then-revert-then-reapply them across several microtask/animation
 * frames (the same catch-and-revert `applyDelta` path that reconciles the
 * base/suggestion docs). Gating on the *first* time `y-attributed` appears
 * therefore captures a transient intermediate state, so `editorHtml(editor)`
 * reads the doc with the decorations sometimes present and sometimes not –
 * the snapshots flip-flop run to run. Instead we poll the serialised doc and
 * only return once it (a) contains a suggestion mark and (b) has been byte-for-
 * byte identical for a few consecutive reads, which means the decorations have
 * finished settling.
 *
 * For tests whose edit changes visible text, prefer waiting on the
 * inserted text via `expect.element(getByText(...))` – it's more
 * meaningful.
 */
export async function waitForSuggestion(editor: GalleryEditor): Promise<void> {
  // Number of consecutive identical reads (that already contain a suggestion
  // mark) required before we consider the doc settled.
  const requiredStableReads = 5;
  let lastSerialised: string | null = null;
  let stableCount = 0;

  await expect
    .poll(
      () => {
        const serialised = editor.prosemirrorState.doc.toString();
        if (!serialised.includes("y-attributed")) {
          // Decorations not applied yet – reset the stability counter.
          lastSerialised = serialised;
          stableCount = 0;
          return false;
        }
        if (serialised === lastSerialised) {
          stableCount += 1;
        } else {
          lastSerialised = serialised;
          stableCount = 1;
        }
        return stableCount >= requiredStableReads;
      },
      // Poll frequently so the "consecutive reads" window spans a short, real
      // stretch of wall-clock time rather than being satisfied instantly.
      { interval: 20, timeout: 5000 },
    )
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
 *
 * We pass an explicit, stable `renderer` (`Y.baseRenderer`) rather than
 * relying on `toDeltaDeep()`'s default. As of @y/prosemirror v2.0.0-6 the
 * default renderer is ambient/mutable, so a no-arg call serialises the
 * *same* Y.Doc differently from run to run (attribution-rich vs. plain),
 * which makes these inline snapshots flip-flop and never converge. Passing
 * `Y.baseRenderer` renders each doc's own intrinsic content + stored
 * attribution deterministically, independent of any live DiffRenderer.
 */
export function ydocXml(
  doc: Y.Doc,
  renderer: Y.AbstractRenderer | null = Y.baseRenderer,
): string {
  const delta = (doc.get("doc") as any).toDeltaDeep({ renderer }).toJSON();
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
  attrs?: Record<string, unknown>;
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
    if (value !== null && typeof value === "object") {
      // Object value: trivial empty `{}` renders as a bare tag, richer
      // objects are JSON-encoded (`String(obj)` would throw / produce
      // "[object Object]").
      if (Object.keys(value).length === 0) {
        out = `<${name}>${out}</${name}>`;
      } else {
        out = `<${name} value="${escapeXml(JSON.stringify(value))}">${out}</${name}>`;
      }
    } else if (value === true) {
      out = `<${name}>${out}</${name}>`;
    } else {
      // Primitive (string / number / boolean / null / undefined).
      out = `<${name} value="${escapeXml(String(value))}">${out}</${name}>`;
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
export function editorHtml(editor: GalleryEditor): string {
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
  // Non-text nodes can also carry marks (used by y-prosemirror for
  // block-level attributions), so this applies to both branches. Mark nesting
  // order is not semantically meaningful, so sort by name to keep the
  // serialized output deterministic across runs.
  const sortedMarks = [...node.marks].sort((a, b) =>
    a.type.name < b.type.name ? -1 : a.type.name > b.type.name ? 1 : 0,
  );
  for (const mark of sortedMarks) {
    out = `<${mark.type.name}${formatAttrs(mark.attrs)}>${out}</${mark.type.name}>`;
  }
  return out;
}

function formatAttrs(attrs: Record<string, unknown>): string {
  // Sort by key so attribute order is deterministic across runs (attribute
  // order is not semantically meaningful).
  return Object.entries(attrs)
    .filter(([, v]) => v !== null && v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
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
