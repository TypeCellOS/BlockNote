/**
 * @vitest-environment jsdom
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from "vite-plus/test";

import type { Block } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { UserStoreOrResolver } from "../../user/index.js";
import { ReadOnlyExtension } from "../ReadOnly/ReadOnly.js";
import { SCROLL_TO_FIRST_CHANGE_DELAY_MS } from "./scrollToFirstChange.js";
import {
  LOADING_PREVIEW_CLASS,
  LOADING_PREVIEW_DELAY_MS,
  VersioningExtension,
} from "./Versioning.js";
import type {
  PreviewController,
  VersioningEndpoints,
  VersioningExtensionOptions,
  VersioningState,
  VersionSnapshot,
} from "./Versioning.js";
import {
  createInMemoryPreviewController,
  createInMemoryVersioningEndpoints,
} from "./inMemoryVersioning.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * A mounted editor with a `VersioningExtension` registered on it — registered
 * rather than built alongside, so the extension's own ProseMirror plugins (the
 * read-only-while-held one) are installed. `build` receives the editor,
 * for options that need to close over it.
 */
function setupWith(
  build: (
    editor: BlockNoteEditor<any, any, any>,
  ) => Pick<VersioningExtensionOptions, "endpoints"> &
    Partial<Omit<VersioningExtensionOptions, "endpoints">>,
) {
  const editor = BlockNoteEditor.create({
    extensions: [
      (ctx) =>
        VersioningExtension({
          preview: createInMemoryPreviewController(ctx.editor),
          getCurrentDocument: () => ctx.editor.document,
          ...build(ctx.editor),
        })(ctx),
    ],
  });
  editor.mount(document.createElement("div"));
  return { editor, ext: editor.getExtension(VersioningExtension)! };
}

function getEditorText(editor: BlockNoteEditor<any, any, any>): string {
  return editor.prosemirrorState.doc.textContent;
}

function setEditorText(editor: BlockNoteEditor<any, any, any>, text: string) {
  editor.replaceBlocks(editor.document, [{ type: "paragraph", content: text }]);
}

/** Resolve or reject a request at an explicit point in a loading transition. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Minimal version factory for versioning tests. */
function snap(
  id: string,
  createdAt: number,
  extra?: Partial<VersionSnapshot>,
): VersionSnapshot {
  return { id, createdAt, ...extra };
}

/** A rest state, with the in-flight flags clear. */
function state(overrides?: Partial<VersioningState>): VersioningState {
  return {
    list: { loaded: false },
    view: { mode: "live" },
    listing: false,
    restoring: false,
    ...overrides,
  };
}

/** The loaded list, or a failure — every test that reads it has listed first. */
function loadedList(ext: { store: { state: VersioningState } }) {
  const { list } = ext.store.state;
  if (!list.loaded) {
    throw new Error("expected the version list to be loaded");
  }
  return list;
}

/**
 * Wire up a real editor with the in-memory versioning adapter.
 *
 * Returns the extension instance, the editor, and helpers to seed versions
 * directly into the backend (bypassing the extension).
 */
function setup(opts?: {
  initialText?: string;
  withoutRestore?: boolean;
  withoutUpdateName?: boolean;
  resolveUsers?: UserStoreOrResolver;
  scrollToFirstChange?: boolean;
}) {
  const endpoints = createInMemoryVersioningEndpoints();
  if (opts?.withoutRestore) {
    endpoints.restore = undefined;
  }
  if (opts?.withoutUpdateName) {
    endpoints.rename = undefined;
  }

  // Registered on the editor rather than built beside it, so the extension's
  // own ProseMirror plugins (the read-only-while-held one) are installed.
  let preview!: ReturnType<typeof createInMemoryPreviewController>;
  const editor = BlockNoteEditor.create({
    extensions: [
      (ctx) => {
        preview = createInMemoryPreviewController(ctx.editor);
        return VersioningExtension({
          endpoints,
          preview,
          // Through the controller, as the real adapter does: while previewing,
          // `editor.document` holds the previewed version, not the live one.
          getCurrentDocument: () => preview.getLiveDocument(),
          serializeCurrentContent: () => preview.getLiveDocument(),
          resolveUsers: opts?.resolveUsers,
          scrollToFirstChange: opts?.scrollToFirstChange,
        })(ctx);
      },
    ],
  });
  editor.mount(document.createElement("div"));
  setEditorText(editor, opts?.initialText ?? "initial doc");

  const ext = editor.getExtension(VersioningExtension)!;

  /** Seed a version into the backend by capturing the current editor doc. */
  const seed = async (text: string, name?: string) => {
    // Temporarily set editor text, create via endpoints, then restore.
    const savedBlocks = editor.document;
    setEditorText(editor, text);
    const blocks = editor.document;
    const snapshot = await endpoints.create!(blocks, { name });
    // Restore original text.
    editor.replaceBlocks(editor.document, savedBlocks);
    // Refresh the store so the extension can resolve the seeded version by id
    // (preview/restore look versions up in the store, as the UI would after
    // listing).
    await ext.list();
    return snapshot;
  };

  return { ext, editor, endpoints, seed };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("VersioningExtension", () => {
  it("requires preview controllers to render synchronously", () => {
    expectTypeOf<() => Promise<void>>().not.toExtend<
      PreviewController["enterPreview"]
    >();
  });

  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  afterEach(() => {
    ctx.editor.unmount();
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  describe("getLoadingState", () => {
    it("is idle when neither operation is in flight", () => {
      expect(ctx.ext.getLoadingState(state())).toEqual({ type: "idle" });
    });

    it("reports listing when only the list is fetching", () => {
      expect(ctx.ext.getLoadingState(state({ listing: true }))).toEqual({
        type: "listing",
      });
    });

    it("reports loading-preview while a preview loads, outranking listing", () => {
      const view = { mode: "snapshot", snapshotId: "a" } as const;
      const previewing = { type: "loading-preview", view } as const;
      expect(ctx.ext.getLoadingState(state({ loadingView: view }))).toEqual(
        previewing,
      );
      expect(
        ctx.ext.getLoadingState(state({ listing: true, loadingView: view })),
      ).toEqual(previewing);
    });
  });

  // -------------------------------------------------------------------------
  // Listing versions
  // -------------------------------------------------------------------------

  describe("listing versions", () => {
    it("starts unloaded and live", () => {
      expect(ctx.ext.store.state.list).toEqual({ loaded: false });
      expect(ctx.ext.store.state.view).toEqual({ mode: "live" });
      expect(ctx.ext.getLoadingState()).toEqual({ type: "idle" });
    });

    it("populates the store from the backend, sorted newest-first", async () => {
      vi.useFakeTimers();

      await ctx.endpoints.create!([], {});
      vi.advanceTimersByTime(1000);
      await ctx.endpoints.create!([], {});
      vi.advanceTimersByTime(1000);
      await ctx.endpoints.create!([], {});

      const result = await ctx.ext.list();

      expect(result.snapshots).toHaveLength(3);
      expect(result.snapshots[0]!.createdAt).toBeGreaterThan(
        result.snapshots[1]!.createdAt,
      );
      expect(result.snapshots[1]!.createdAt).toBeGreaterThan(
        result.snapshots[2]!.createdAt,
      );
      expect(result.current).toBeDefined();
      expect(ctx.ext.store.state.list).toEqual(result);

      vi.useRealTimers();
    });

    it("never touches the view", async () => {
      const seeded = await ctx.seed("snapshot content");
      await ctx.ext.previewSnapshot(seeded.id);
      expect(ctx.ext.store.state.view).toEqual({
        mode: "snapshot",
        snapshotId: seeded.id,
        compareToId: undefined,
      });

      await ctx.ext.list();

      expect(ctx.ext.store.state.view).toEqual({
        mode: "snapshot",
        snapshotId: seeded.id,
        compareToId: undefined,
      });
    });

    it("reflects backend changes on subsequent calls", async () => {
      expect((await ctx.ext.list()).snapshots).toEqual([]);

      await ctx.endpoints.create!([], {});

      expect((await ctx.ext.list()).snapshots).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Editability
  // -------------------------------------------------------------------------

  describe("editability", () => {
    it("is read-only while previewing and editable again on exit", async () => {
      const seeded = await ctx.seed("snapshot content");
      expect(ctx.editor.isEditable).toBe(true);

      await ctx.ext.previewSnapshot(seeded.id);
      expect(ctx.editor.isEditable).toBe(false);

      ctx.ext.exitPreview();
      expect(ctx.editor.isEditable).toBe(true);
    });

    it("stays read-only across preview switches", async () => {
      const s1 = await ctx.seed("content s1");
      const s2 = await ctx.seed("content s2");

      await ctx.ext.previewSnapshot(s1.id);
      await ctx.ext.previewSnapshot(s2.id);
      expect(ctx.editor.isEditable).toBe(false);

      ctx.ext.exitPreview();
      expect(ctx.editor.isEditable).toBe(true);
    });

    it("ignores an `isEditable` set while previewing, and honours it on exit", async () => {
      const seeded = await ctx.seed("snapshot content");
      await ctx.ext.previewSnapshot(seeded.id);

      // What a React re-render does: re-applies the host's `editable` prop.
      ctx.editor.isEditable = true;
      expect(ctx.editor.isEditable).toBe(false);

      ctx.ext.exitPreview();
      expect(ctx.editor.isEditable).toBe(true);
    });

    it("preserves a host change to read-only made during preview", async () => {
      const seeded = await ctx.seed("snapshot content");
      await ctx.ext.previewSnapshot(seeded.id);

      ctx.editor.isEditable = false;
      ctx.ext.exitPreview();

      expect(ctx.editor.isEditable).toBe(false);
      ctx.editor.isEditable = true;
      expect(ctx.editor.isEditable).toBe(true);
    });

    it("leaves another feature's read-only restriction in place on exit", async () => {
      const seeded = await ctx.seed("snapshot content");
      const readOnly = ctx.editor.getExtension(ReadOnlyExtension)!;
      await ctx.ext.previewSnapshot(seeded.id);
      readOnly.setReadOnly(true, "upload");

      ctx.ext.exitPreview();
      expect(ctx.editor.isEditable).toBe(false);

      readOnly.setReadOnly(false, "upload");
      expect(ctx.editor.isEditable).toBe(true);
    });

    it("leaves a read-only editor read-only", async () => {
      const seeded = await ctx.seed("snapshot content");
      ctx.editor.isEditable = false;

      await ctx.ext.previewSnapshot(seeded.id);
      expect(ctx.editor.isEditable).toBe(false);

      ctx.ext.exitPreview();
      expect(ctx.editor.isEditable).toBe(false);
    });

    it("can be changed from inside a transaction", async () => {
      // A dispatch of its own in here would leave the pending transaction
      // built on a stale state; the change has to ride along with it instead.
      ctx.editor.transact((tr) => {
        tr.insertText("!", 1);
        ctx.editor.isEditable = false;
      });
      expect(ctx.editor.isEditable).toBe(false);
      expect(getEditorText(ctx.editor)).toBe("!initial doc");

      ctx.editor.transact(() => {
        ctx.editor.isEditable = true;
      });
      expect(ctx.editor.isEditable).toBe(true);
    });

    it("does not report a document change for the editability change", async () => {
      const seeded = await ctx.seed("snapshot content");
      await ctx.ext.previewSnapshot(seeded.id);

      let changes = 0;
      ctx.editor.onChange(() => changes++);
      ctx.ext.exitPreview();

      // Exiting restores the live document through the preview controller,
      // which is one change; becoming editable again is not another.
      expect(changes).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------

  describe("status", () => {
    it.each(["resolve", "reject"] as const)(
      "keeps the latest preview busy when an older request completes via %s",
      async (outcome) => {
        const first = await ctx.seed("first content");
        const second = await ctx.seed("second content");
        const firstRequest = deferred<Block[]>();
        const secondRequest = deferred<Block[]>();
        vi.spyOn(ctx.endpoints, "getContent")
          .mockReturnValueOnce(firstRequest.promise)
          .mockReturnValueOnce(secondRequest.promise);

        vi.useFakeTimers();
        try {
          const older = ctx.ext.previewSnapshot(first.id);
          vi.advanceTimersByTime(LOADING_PREVIEW_DELAY_MS);
          const newer = ctx.ext.previewSnapshot(second.id);
          const latestView = {
            mode: "snapshot",
            snapshotId: second.id,
            compareToId: undefined,
          };
          expect(
            ctx.editor.domElement!.classList.contains(LOADING_PREVIEW_CLASS),
          ).toBe(true);

          if (outcome === "reject") {
            const failure = expect(older).rejects.toThrow("old request failed");
            firstRequest.reject(new Error("old request failed"));
            await failure;
          } else {
            firstRequest.resolve(ctx.editor.document);
            await older;
          }
          expect(ctx.ext.store.state.view).toEqual(latestView);
          expect(ctx.ext.getLoadingState()).toEqual({
            type: "loading-preview",
            view: latestView,
          });
          expect(
            ctx.editor.domElement!.classList.contains(LOADING_PREVIEW_CLASS),
          ).toBe(true);
          expect(ctx.editor.isEditable).toBe(false);
          expect(getEditorText(ctx.editor)).toBe("initial doc");

          secondRequest.resolve([]);
          await newer;
          expect(ctx.ext.store.state.view).toEqual(latestView);
          expect(ctx.ext.getLoadingState()).toEqual({
            type: "idle",
          });
          expect(
            ctx.editor.domElement!.classList.contains(LOADING_PREVIEW_CLASS),
          ).toBe(false);
          expect(getEditorText(ctx.editor)).toBe("");
        } finally {
          vi.useRealTimers();
        }
      },
    );

    it.each(["content", "baseline", "attributions"] as const)(
      "stays busy until comparison %s finishes",
      async (stage) => {
        const gate = deferred<void>();
        const current = snap("current", 30);
        const shown = snap("shown", 20);
        const baseline = snap("baseline", 10);
        const enterPreview = vi.fn(() => undefined);
        const { editor, ext } = setupWith(() => ({
          endpoints: {
            list: async () => ({ current, snapshots: [shown, baseline] }),
            getContent: async (snapshot) => {
              if (
                (stage === "content" && snapshot.id === shown.id) ||
                (stage === "baseline" && snapshot.id === baseline.id)
              ) {
                await gate.promise;
              }
              return [];
            },
            getAttributions: async () => {
              if (stage === "attributions") {
                await gate.promise;
              }
              return undefined;
            },
          },
          preview: { enterPreview, exitPreview: () => {} },
        }));
        try {
          await ext.list();
          const pending = ext.previewSnapshot(shown.id, {
            compareTo: baseline.id,
          });
          expect(ext.getLoadingState()).toEqual({
            type: "loading-preview",
            view: {
              mode: "snapshot",
              snapshotId: shown.id,
              compareToId: baseline.id,
            },
          });
          expect(editor.isEditable).toBe(false);
          expect(enterPreview).not.toHaveBeenCalled();

          gate.resolve();
          await pending;
          expect(enterPreview).toHaveBeenCalledOnce();
          expect(ext.getLoadingState()).toEqual({ type: "idle" });
          expect(ext.store.state.view).toEqual({
            mode: "snapshot",
            snapshotId: shown.id,
            compareToId: baseline.id,
          });
          expect(editor.isEditable).toBe(false);
        } finally {
          gate.resolve();
          editor.unmount();
        }
      },
    );

    it.each([0, LOADING_PREVIEW_DELAY_MS])(
      "clears pending preview loading on exit after %i ms",
      async (elapsed) => {
        const seeded = await ctx.seed("old content");
        const { promise: gate, resolve: release } = deferred<void>();
        const getContent = ctx.endpoints.getContent;
        ctx.endpoints.getContent = async (snapshot) => {
          await gate;
          return getContent(snapshot);
        };

        vi.useFakeTimers();
        try {
          const pending = ctx.ext.previewSnapshot(seeded.id);
          vi.advanceTimersByTime(elapsed);
          ctx.ext.exitPreview();

          expect(ctx.ext.getLoadingState()).toEqual({
            type: "idle",
          });
          expect(ctx.editor.isEditable).toBe(true);
          expect(
            ctx.editor.domElement!.classList.contains(LOADING_PREVIEW_CLASS),
          ).toBe(false);
          // Exiting before the delay must also cancel the scheduled indicator.
          vi.advanceTimersByTime(LOADING_PREVIEW_DELAY_MS);
          expect(
            ctx.editor.domElement!.classList.contains(LOADING_PREVIEW_CLASS),
          ).toBe(false);

          release();
          await pending;
          expect(ctx.ext.store.state.view).toEqual({ mode: "live" });
          expect(getEditorText(ctx.editor)).toBe("initial doc");
        } finally {
          release();
          vi.useRealTimers();
        }
      },
    );
  });

  // -------------------------------------------------------------------------
  // Naming the current version
  // -------------------------------------------------------------------------

  describe("naming the current version", () => {
    it("captures the current state as the current row", async () => {
      setEditorText(ctx.editor, "my document content");

      const snapshot = await ctx.ext.create!({ name: "Draft 1" });

      expect(snapshot.name).toBe("Draft 1");
      expect(loadedList(ctx.ext).current).toEqual(snapshot);
      expect(loadedList(ctx.ext).snapshots).toHaveLength(0);

      // A new history session lists again and accepts the backend's shape.
      const reopened = await ctx.ext.list();
      expect(reopened.current.id).not.toBe(snapshot.id);
      expect(reopened.snapshots).toContainEqual(snapshot);

      // The version content should round-trip — verify by previewing.
      await ctx.ext.previewSnapshot(snapshot.id);
      expect(getEditorText(ctx.editor)).toBe("my document content");
    });

    it("does not invent history when Current is named twice in one session", async () => {
      const first = await ctx.ext.create!({ name: "First" });
      const second = await ctx.ext.create!({ name: "Second" });

      expect(loadedList(ctx.ext).current).toEqual(second);
      expect(loadedList(ctx.ext).snapshots).not.toContainEqual(first);
    });

    it("maintains newest-first order", async () => {
      vi.useFakeTimers();

      const old = await ctx.seed("old content", "Old");
      vi.advanceTimersByTime(1000);

      const newer = await ctx.ext.create!({ name: "Newer" });

      expect(loadedList(ctx.ext).current.id).toBe(newer.id);
      expect(loadedList(ctx.ext).snapshots[0]!.id).toBe(old.id);

      vi.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // Previewing
  // -------------------------------------------------------------------------

  describe("previewing versions", () => {
    it("shows a version and tracks it in the view", async () => {
      const seeded = await ctx.seed("snapshot content");

      await ctx.ext.previewSnapshot(seeded.id);

      expect(ctx.ext.store.state.view).toEqual({
        mode: "snapshot",
        snapshotId: seeded.id,
        compareToId: undefined,
      });
      expect(getEditorText(ctx.editor)).toBe("snapshot content");
    });

    it("supports comparing against an older version", async () => {
      const v1 = await ctx.seed("content v1");
      const v2 = await ctx.seed("content v2");

      // The in-memory preview controller doesn't render diffs, but the call
      // should succeed and show the primary version's content.
      await ctx.ext.previewSnapshot(v2.id, { compareTo: v1.id });

      expect(ctx.ext.store.state.view).toEqual({
        mode: "snapshot",
        snapshotId: v2.id,
        compareToId: v1.id,
      });
      expect(getEditorText(ctx.editor)).toBe("content v2");
    });

    it("switching previews updates to the new version", async () => {
      const s1 = await ctx.seed("content s1");
      const s2 = await ctx.seed("content s2");

      await ctx.ext.previewSnapshot(s1.id);
      expect(getEditorText(ctx.editor)).toBe("content s1");

      await ctx.ext.previewSnapshot(s2.id);
      expect(ctx.ext.store.state.view).toEqual({
        mode: "snapshot",
        snapshotId: s2.id,
        compareToId: undefined,
      });
      expect(getEditorText(ctx.editor)).toBe("content s2");
    });
  });

  // -------------------------------------------------------------------------
  // Scroll to first change
  // -------------------------------------------------------------------------

  describe("scroll to first change", () => {
    /**
     * A preview controller that stamps one attribution mark into the editor
     * DOM, the way the real diff renderer does. It has to happen inside
     * `enterPreview`: locking editability redraws the ProseMirror view, which
     * strips any foreign node put there beforehand.
     */
    function setupScrollProbe(opts?: { scroll?: boolean; withMark?: boolean }) {
      const { editor, ext } = setupWith((editor) => ({
        endpoints: {
          list: async () => ({
            current: snap("current", 30),
            snapshots: [snap("a", 10), snap("b", 5)],
          }),
          getContent: async () => [],
          getAttributions: async () => undefined,
        } satisfies VersioningEndpoints,
        preview: {
          enterPreview: () => {
            if (opts?.withMark === false) {
              return;
            }
            const mark = document.createElement("span");
            mark.dataset["userIds"] = '["u1"]';
            // jsdom has no layout, and the scroll skips marks without a box.
            const content = document.createElement("span");
            content.getBoundingClientRect = () =>
              ({ width: 100, height: 20 }) as DOMRect;
            mark.appendChild(content);
            editor.domElement!.appendChild(mark);
          },
          exitPreview: () => {},
          applyRestore: () => {},
        },
        scrollToFirstChange: opts?.scroll,
      }));
      return { editor, ext };
    }

    /** Wait out the delay between a preview rendering and its scroll. */
    async function awaitScrollDelay() {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, SCROLL_TO_FIRST_CHANGE_DELAY_MS + 50),
      );
    }

    // jsdom doesn't implement `scrollIntoView` at all, so this installs it
    // rather than spying on an existing method.
    const hadScrollIntoView = "scrollIntoView" in Element.prototype;
    let scrollIntoView: ReturnType<typeof vi.fn<Element["scrollIntoView"]>>;

    beforeEach(() => {
      scrollIntoView = vi.fn<Element["scrollIntoView"]>();
      Element.prototype.scrollIntoView = scrollIntoView;
    });

    afterEach(() => {
      if (!hadScrollIntoView) {
        Reflect.deleteProperty(Element.prototype, "scrollIntoView");
      }
    });

    it("scrolls to the first attribution mark once, after a comparison", async () => {
      const { editor, ext } = setupScrollProbe();

      await ext.list();
      await ext.previewSnapshot("a", { compareTo: "b" });
      await awaitScrollDelay();

      expect(scrollIntoView).toHaveBeenCalledTimes(1);

      editor.unmount();
    });

    it("does nothing when the preview has no attribution marks", async () => {
      const { editor, ext } = setupScrollProbe({ withMark: false });

      await ext.list();
      await ext.previewSnapshot("a", { compareTo: "b" });
      await awaitScrollDelay();

      expect(scrollIntoView).not.toHaveBeenCalled();

      editor.unmount();
    });

    it("does nothing when disabled", async () => {
      const { editor, ext } = setupScrollProbe({ scroll: false });

      await ext.list();
      await ext.previewSnapshot("a", { compareTo: "b" });
      await awaitScrollDelay();

      expect(scrollIntoView).not.toHaveBeenCalled();

      editor.unmount();
    });
  });

  // -------------------------------------------------------------------------
  // Exiting preview
  // -------------------------------------------------------------------------

  describe("exiting preview", () => {
    it("clears the preview state and restores the live document", async () => {
      setEditorText(ctx.editor, "live content");
      const seeded = await ctx.seed("snapshot content");

      await ctx.ext.previewSnapshot(seeded.id);
      expect(getEditorText(ctx.editor)).toBe("snapshot content");

      ctx.ext.exitPreview();

      expect(ctx.ext.store.state.view).toEqual({ mode: "live" });
      expect(getEditorText(ctx.editor)).toBe("live content");
    });
  });

  // -------------------------------------------------------------------------
  // The live document behind a preview
  // -------------------------------------------------------------------------

  describe("the live document while previewing", () => {
    it("previews the current version as the live document, not what is on screen", async () => {
      setEditorText(ctx.editor, "live content");
      const seeded = await ctx.seed("snapshot content");

      await ctx.ext.previewSnapshot(seeded.id);
      expect(getEditorText(ctx.editor)).toBe("snapshot content");

      await ctx.ext.previewCurrentVersion!();
      expect(getEditorText(ctx.editor)).toBe("live content");
      expect(ctx.ext.store.state.view).toEqual({
        mode: "current",
        compareToId: undefined,
      });
    });

    it("names the live document, not the previewed one", async () => {
      setEditorText(ctx.editor, "live content");
      const seeded = await ctx.seed("snapshot content");

      await ctx.ext.previewSnapshot(seeded.id);
      const named = await ctx.ext.create!({ name: "named while previewing" });

      await ctx.ext.previewSnapshot(named.id);
      expect(getEditorText(ctx.editor)).toBe("live content");
    });
  });

  // -------------------------------------------------------------------------
  // Restoring
  // -------------------------------------------------------------------------

  describe("restoring versions", () => {
    it("re-lists once after restoring", async () => {
      const seeded = await ctx.seed("old content");
      const list = vi.spyOn(ctx.endpoints, "list");
      await ctx.ext.restore!(seeded.id);
      expect(list).toHaveBeenCalledTimes(1);
      expect(ctx.editor.isEditable).toBe(true);
      expect(getEditorText(ctx.editor)).toBe("old content");
    });

    it("applies the version content and exits any active preview", async () => {
      setEditorText(ctx.editor, "current doc");
      const seeded = await ctx.seed("old content");

      await ctx.ext.previewSnapshot(seeded.id);
      await ctx.ext.restore!(seeded.id);

      expect(getEditorText(ctx.editor)).toBe("old content");
      expect(ctx.ext.store.state.view).toEqual({ mode: "live" });
    });

    it("stays read-only and in preview until the backend has answered", async () => {
      const seeded = await ctx.seed("old content");
      await ctx.ext.previewSnapshot(seeded.id);

      const gate = deferred<void>();
      const backendRestore = ctx.endpoints.restore!;
      ctx.endpoints.restore = vi.fn(
        async (doc: Block<any, any, any>[], snapshot: VersionSnapshot) => {
          await gate.promise;
          return backendRestore(doc, snapshot);
        },
      );

      const restoring = ctx.ext.restore!(seeded.id);
      // Mid-restore: nothing can be typed into a document about to be replaced.
      expect(ctx.editor.isEditable).toBe(false);
      expect(ctx.ext.store.state.view.mode).toBe("snapshot");

      gate.resolve();
      await restoring;
      expect(ctx.editor.isEditable).toBe(true);
      expect(getEditorText(ctx.editor)).toBe("old content");
    });

    it("stays read-only until the list has been refreshed as well", async () => {
      const seeded = await ctx.seed("old content");
      await ctx.ext.previewSnapshot(seeded.id);

      const gate = deferred<void>();
      const backendList = ctx.endpoints.list;
      ctx.endpoints.list = vi.fn(async () => {
        await gate.promise;
        return backendList();
      });

      const restoring = ctx.ext.restore!(seeded.id);
      await vi.waitFor(() => expect(ctx.endpoints.list).toHaveBeenCalled());
      // The restored content is already live, but remains read-only while
      // the sidebar's list catches up.
      expect(ctx.editor.isEditable).toBe(false);
      expect(ctx.ext.store.state.view.mode).toBe("live");
      expect(getEditorText(ctx.editor)).toBe("old content");

      gate.resolve();
      await restoring;
      expect(ctx.editor.isEditable).toBe(true);
      expect(ctx.ext.store.state.view).toEqual({ mode: "live" });
      expect(getEditorText(ctx.editor)).toBe("old content");
    });

    it.each([false, true])(
      "keeps a successful restore when re-listing fails (preview: %s)",
      async (previewing) => {
        setEditorText(ctx.editor, "live content");
        const seeded = await ctx.seed("old content");
        if (previewing) {
          await ctx.ext.previewSnapshot(seeded.id);
        }
        ctx.endpoints.list = async () => {
          throw new Error("list offline");
        };

        await expect(ctx.ext.restore!(seeded.id)).rejects.toThrow(
          "list offline",
        );

        expect(ctx.ext.store.state.view).toEqual({ mode: "live" });
        expect(ctx.ext.store.state.restoring).toBe(false);
        expect(ctx.editor.isEditable).toBe(true);
        expect(getEditorText(ctx.editor)).toBe("old content");
      },
    );

    it("leaves the user where they were when the backend rejects", async () => {
      setEditorText(ctx.editor, "live content");
      const seeded = await ctx.seed("old content");
      await ctx.ext.previewSnapshot(seeded.id);
      ctx.endpoints.restore = vi.fn(async () => {
        throw new Error("network");
      });

      await expect(ctx.ext.restore!(seeded.id)).rejects.toThrow("network");

      expect(ctx.editor.isEditable).toBe(false);
      expect(ctx.ext.store.state.view).toEqual({
        mode: "snapshot",
        snapshotId: seeded.id,
        compareToId: undefined,
      });
      expect(getEditorText(ctx.editor)).toBe("old content");
    });

    it("picks up server-side rows after re-listing", async () => {
      const seeded = await ctx.seed("original");

      await ctx.ext.restore!(seeded.id);

      const updated = loadedList(ctx.ext);
      expect(updated.snapshots).toHaveLength(2);
      expect(updated.current.restoredFrom).toEqual({
        id: seeded.id,
        createdAt: seeded.createdAt,
      });
    });

    it("reports restore as unavailable when endpoint omits it", () => {
      const noRestore = setup({ withoutRestore: true });
      expect(noRestore.ext.restore).toBeUndefined();
      noRestore.editor.unmount();
    });

    it("reports restore as unavailable when the preview controller can't apply it", () => {
      const noApply = setupWith((editor) => {
        const controller = createInMemoryPreviewController(editor);
        return {
          endpoints: createInMemoryVersioningEndpoints(),
          // Delegated rather than spread: the controller's
          // `supportsComparison` is a getter that needs the mounted editor,
          // so spreading it during `create` would throw. The methods are
          // closure-based, so detaching them is safe.
          preview: {
            enterPreview: controller.enterPreview,
            exitPreview: controller.exitPreview,
            get supportsComparison() {
              return controller.supportsComparison;
            },
          },
          getCurrentDocument: () => controller.getLiveDocument(),
          serializeCurrentContent: () => controller.getLiveDocument(),
        };
      });

      expect(noApply.ext.restore).toBeUndefined();
      noApply.editor.unmount();
    });
  });

  // -------------------------------------------------------------------------
  // Removing
  // -------------------------------------------------------------------------

  describe("removing versions", () => {
    it("exits the preview when the removed version is being previewed", async () => {
      const seeded = await ctx.seed("content");
      await ctx.ext.previewSnapshot(seeded.id);

      await ctx.ext.remove!(seeded.id);

      expect(ctx.ext.store.state.view).toEqual({ mode: "live" });
      expect(ctx.editor.isEditable).toBe(true);
      expect(loadedList(ctx.ext).snapshots).toHaveLength(0);
    });

    it("exits the preview when the removed version is the baseline", async () => {
      const baseline = await ctx.seed("content v1");
      const shown = await ctx.seed("content v2");
      await ctx.ext.previewSnapshot(shown.id, { compareTo: baseline.id });

      await ctx.ext.remove!(baseline.id);

      expect(ctx.ext.store.state.view).toEqual({ mode: "live" });
      expect(loadedList(ctx.ext).snapshots.map((s) => s.id)).toEqual([
        shown.id,
      ]);
    });

    it("keeps the preview when an unrelated version is removed", async () => {
      const other = await ctx.seed("content v1");
      const shown = await ctx.seed("content v2");
      await ctx.ext.previewSnapshot(shown.id);

      await ctx.ext.remove!(other.id);

      expect(ctx.ext.store.state.view).toEqual({
        mode: "snapshot",
        snapshotId: shown.id,
        compareToId: undefined,
      });
    });

    it("keeps the preview when the backend keeps the row", async () => {
      // A continuous-history backend (YHub): removing a version only drops
      // its name, and the row is still there to look at.
      const shown = await ctx.seed("content", "named");
      await ctx.ext.previewSnapshot(shown.id);
      ctx.endpoints.remove = vi.fn(async (snapshot) => {
        await ctx.endpoints.rename!(snapshot, undefined);
      });

      await ctx.ext.remove!(shown.id);

      expect(ctx.ext.store.state.view).toEqual({
        mode: "snapshot",
        snapshotId: shown.id,
        compareToId: undefined,
      });
      expect(ctx.editor.isEditable).toBe(false);
      expect(loadedList(ctx.ext).snapshots[0]!.name).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Renaming
  // -------------------------------------------------------------------------

  describe("renaming versions", () => {
    it("renames a version in the store and backend", async () => {
      const seeded = await ctx.seed("content", "Original");

      await ctx.ext.rename!(seeded.id, "Renamed");

      // Store was patched in place.
      expect(loadedList(ctx.ext).snapshots[0]!.name).toBe("Renamed");

      // Backend was also updated (verified via list).
      const list = await ctx.ext.list();
      expect(list.snapshots.find((s) => s.id === seeded.id)!.name).toBe(
        "Renamed",
      );
    });

    it("clears the name when renamed to undefined", async () => {
      const seeded = await ctx.seed("content", "Original");

      await ctx.ext.rename!(seeded.id, undefined);

      expect(loadedList(ctx.ext).snapshots[0]!.name).toBeUndefined();
    });

    it("reports name updates as unavailable when endpoint omits it", () => {
      const noUpdate = setup({ withoutUpdateName: true });
      expect(noUpdate.ext.rename).toBeUndefined();
      noUpdate.editor.unmount();
    });
  });

  // -------------------------------------------------------------------------
  // User store (author resolution for `VersionSnapshot.by`)
  // -------------------------------------------------------------------------

  describe("user store", () => {
    it("exposes an empty user store when no resolveUsers is provided", async () => {
      expect(ctx.ext.userStore).toBeDefined();
      await ctx.ext.userStore.loadUsers(["u1"]);
      expect(ctx.ext.userStore.getUser("u1")).toBeUndefined();
    });

    it("builds a de-duped user store from a resolveUsers callback", async () => {
      const resolveUsers = vi.fn(async (ids: string[]) =>
        ids.map((id) => ({ id, username: `name-${id}`, avatarUrl: "" })),
      );
      const withUsers = setup({ resolveUsers });

      await withUsers.ext.userStore.loadUsers(["u1", "u2"]);
      expect(withUsers.ext.userStore.getUser("u1")?.username).toBe("name-u1");
      expect(withUsers.ext.userStore.getUser("u2")?.username).toBe("name-u2");

      // Already-cached ids are not re-fetched.
      await withUsers.ext.userStore.loadUsers(["u1"]);
      expect(resolveUsers).toHaveBeenCalledTimes(1);

      withUsers.editor.unmount();
    });

    it("passes `by` author ids through list() untouched", async () => {
      const { editor, ext } = setupWith(() => ({
        endpoints: {
          list: async () => ({
            current: snap("current", 200),
            snapshots: [snap("1", 100, { by: ["u1", "u2"] })],
          }),
          getContent: async () => [],
        } satisfies VersioningEndpoints,
      }));

      const result = await ext.list();

      // Raw ids are preserved — resolving them to user info is the view
      // layer's job (via `ext.userStore`), never the extension's.
      expect(result.snapshots[0]!.by).toEqual(["u1", "u2"]);
      expect(result.snapshots[0]!.secondaryLabel).toBeUndefined();
      expect(ext.store.state.list).toEqual(result);

      editor.unmount();
    });
  });

  // -------------------------------------------------------------------------
  // End-to-end workflow
  // -------------------------------------------------------------------------

  describe("workflow: name, preview with diff, then restore", () => {
    it("handles the full version-history flow", async () => {
      vi.useFakeTimers();

      // 1. Name version 1.
      setEditorText(ctx.editor, "doc v1");
      const v1 = await ctx.ext.create!({ name: "Version 1" });

      vi.advanceTimersByTime(1000);

      // 2. Modify and name version 2.
      setEditorText(ctx.editor, "doc v2");
      // Reopening history makes the backend-confirmed v1 row available.
      await ctx.ext.list();
      const v2 = await ctx.ext.create!({ name: "Version 2" });
      expect(loadedList(ctx.ext).current.id).toBe(v2.id);
      expect(loadedList(ctx.ext).snapshots[0]!.id).toBe(v1.id);

      // 3. Preview v1 with diff comparison against v2.
      await ctx.ext.previewSnapshot(v1.id, { compareTo: v2.id });
      expect(getEditorText(ctx.editor)).toBe("doc v1");

      // 4. Restore v1.
      await ctx.ext.restore!(v1.id);
      expect(getEditorText(ctx.editor)).toBe("doc v1");
      expect(ctx.ext.store.state.view).toEqual({ mode: "live" });

      vi.useRealTimers();
    });
  });
});
