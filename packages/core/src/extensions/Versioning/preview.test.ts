/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vite-plus/test";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { Store } from "../../util/Store.js";
import {
  createPreviewSession,
  LOADING_PREVIEW_CLASS,
  LOADING_PREVIEW_DELAY_MS,
} from "./preview.js";
import type {
  PreviewController,
  VersioningEndpoints,
  VersioningList,
  VersioningState,
  VersionSnapshot,
} from "./types.js";

function snap(
  id: string,
  createdAt: number,
  extra?: Partial<VersionSnapshot>,
): VersionSnapshot {
  return { id, createdAt, ...extra };
}

function loadedList(
  snapshots: VersionSnapshot[],
  current: VersionSnapshot = snap("current", 30),
): VersioningList {
  return { loaded: true, current, snapshots };
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

function makeSession(opts?: {
  list?: VersioningList;
  serializeCurrentContent?: () => any;
}) {
  const store = new Store<VersioningState>({
    list: opts?.list ?? { loaded: false },
    view: { mode: "live" },
    listing: false,
    restoring: false,
  });
  const preview = {
    enterPreview: vi.fn<PreviewController["enterPreview"]>(),
    exitPreview: vi.fn<PreviewController["exitPreview"]>(),
    applyRestore: vi.fn<NonNullable<PreviewController["applyRestore"]>>(),
  } satisfies PreviewController;
  const classList = { add: vi.fn(), remove: vi.fn() };
  const editor = {
    domElement: { classList },
  } as unknown as BlockNoteEditor<any, any, any>;
  const getContent = vi.fn<VersioningEndpoints["getContent"]>();
  const getAttributions =
    vi.fn<NonNullable<VersioningEndpoints["getAttributions"]>>();
  const endpoints: VersioningEndpoints = {
    list: async () => ({ current: snap("current", 30), snapshots: [] }),
    getContent,
    getAttributions,
  };
  const session = createPreviewSession({
    store,
    endpoints,
    preview,
    serializeCurrentContent: opts?.serializeCurrentContent,
    editor,
    scrollToFirstChangeEnabled: false,
  });
  return {
    store,
    preview,
    classList,
    editor,
    getContent,
    getAttributions,
    session,
  };
}

describe("createPreviewSession", () => {
  it("previews a snapshot: renders it, tracks the view, and reports loading", async () => {
    const stored = snap("a", 10);
    const { store, preview, getContent, session } = makeSession({
      list: loadedList([stored]),
    });
    getContent.mockResolvedValue("content a");

    const pending = session.previewSnapshot("a");

    // Synchronous before the fetch settles: view is set, loading reported.
    expect(store.state.view).toEqual({
      mode: "snapshot",
      snapshotId: "a",
      compareToId: undefined,
    });
    expect(store.state.loadingView).toEqual({
      mode: "snapshot",
      snapshotId: "a",
      compareToId: undefined,
    });

    await pending;
    expect(preview.enterPreview).toHaveBeenCalledTimes(1);
    expect(preview.enterPreview).toHaveBeenCalledWith(
      "content a",
      undefined,
      undefined,
      { target: { kind: "snapshot", snapshot: stored }, compareTo: undefined },
    );
    expect(store.state.loadingView).toBeUndefined();
  });

  it("rejects when the snapshot id is unknown", async () => {
    const { session } = makeSession({ list: loadedList([snap("a", 10)]) });
    await expect(session.previewSnapshot("nope")).rejects.toThrow(
      "Snapshot not found: nope",
    );
  });

  it("fetches the baseline and attributions when comparing against an older version", async () => {
    const baseline = snap("baseline", 5);
    const shown = snap("shown", 10);
    const { store, preview, getContent, getAttributions, session } =
      makeSession({
        list: loadedList([shown, baseline], snap("current", 30)),
      });
    getContent.mockImplementation(async (snapshot) =>
      snapshot.id === "shown" ? "shown content" : "baseline content",
    );
    getAttributions.mockResolvedValue(["attr"]);

    await session.previewSnapshot("shown", { compareTo: "baseline" });

    expect(getContent).toHaveBeenCalledTimes(2);
    expect(preview.enterPreview).toHaveBeenCalledWith(
      "shown content",
      "baseline content",
      ["attr"],
      { target: { kind: "snapshot", snapshot: shown }, compareTo: baseline },
    );
    expect(store.state.view).toEqual({
      mode: "snapshot",
      snapshotId: "shown",
      compareToId: "baseline",
    });
  });

  it("a superseded preview never renders", async () => {
    const { store, preview, getContent, session } = makeSession({
      list: loadedList([snap("b", 20), snap("a", 10)]),
    });
    const aRequest = deferred<string>();
    const bRequest = deferred<string>();
    getContent.mockImplementation(async (snapshot) =>
      snapshot.id === "a" ? aRequest.promise : bRequest.promise,
    );

    const first = session.previewSnapshot("a");
    const second = session.previewSnapshot("b");

    // Resolve the *newer* request first: it renders.
    bRequest.resolve("content b");
    await second;
    expect(preview.enterPreview).toHaveBeenCalledTimes(1);
    expect(preview.enterPreview).toHaveBeenCalledWith(
      "content b",
      undefined,
      undefined,
      expect.anything(),
    );

    // The older request settling late must not draw over the newer preview.
    aRequest.resolve("content a");
    await first;
    expect(preview.enterPreview).toHaveBeenCalledTimes(1);
    expect(store.state.view).toEqual({
      mode: "snapshot",
      snapshotId: "b",
      compareToId: undefined,
    });
  });

  it("rolls the view back to live and clears loading when the latest fetch throws", async () => {
    const { store, preview, getContent, session } = makeSession({
      list: loadedList([snap("a", 10)]),
    });
    getContent.mockRejectedValue(new Error("boom"));

    await expect(session.previewSnapshot("a")).rejects.toThrow("boom");

    expect(store.state.view).toEqual({ mode: "live" });
    expect(store.state.loadingView).toBeUndefined();
    expect(preview.enterPreview).not.toHaveBeenCalled();
  });

  it("rolls back to what was actually rendered when a switch fails", async () => {
    const { store, preview, getContent, session } = makeSession({
      list: loadedList([snap("shown", 20), snap("next", 10)]),
    });
    getContent.mockImplementation(async (snapshot) => {
      if (snapshot.id === "shown") {
        return "shown content";
      }
      throw new Error("offline");
    });

    await session.previewSnapshot("shown");
    expect(preview.enterPreview).toHaveBeenCalledTimes(1);

    await expect(session.previewSnapshot("next")).rejects.toThrow("offline");

    // The failed switch never rendered, so the view falls back to the shown one.
    expect(store.state.view).toEqual({
      mode: "snapshot",
      snapshotId: "shown",
      compareToId: undefined,
    });
    expect(store.state.loadingView).toBeUndefined();
    expect(preview.enterPreview).toHaveBeenCalledTimes(1);
  });

  it("exits a rendered preview through the controller and restores the live view", async () => {
    const { store, preview, getContent, session } = makeSession({
      list: loadedList([snap("a", 10)]),
    });
    getContent.mockResolvedValue("content a");
    await session.previewSnapshot("a");
    expect(preview.enterPreview).toHaveBeenCalledTimes(1);

    session.exitPreview();

    expect(store.state.view).toEqual({ mode: "live" });
    expect(preview.exitPreview).toHaveBeenCalledTimes(1);
    expect(store.state.loadingView).toBeUndefined();
  });

  it("leaves the controller alone while the preview is still fetching", async () => {
    const { store, preview, getContent, session } = makeSession({
      list: loadedList([snap("a", 10)]),
    });
    const request = deferred<string>();
    getContent.mockReturnValue(request.promise);

    const pending = session.previewSnapshot("a");
    session.exitPreview();

    // Nothing replaced the document yet, so the controller has nothing to
    // put back.
    expect(preview.exitPreview).not.toHaveBeenCalled();
    expect(store.state.view).toEqual({ mode: "live" });
    expect(store.state.loadingView).toBeUndefined();

    // Exiting bumped the token: the in-flight fetch bails without rendering.
    request.resolve("content a");
    await pending;
    expect(preview.enterPreview).not.toHaveBeenCalled();
    expect(store.state.view).toEqual({ mode: "live" });
  });

  it("leaves the controller alone when already live", async () => {
    const { store, preview, session } = makeSession();
    session.exitPreview();
    session.exitPreview();
    expect(preview.exitPreview).not.toHaveBeenCalled();
    expect(store.state.view).toEqual({ mode: "live" });
  });

  it("exits through a controller that threw while rendering", async () => {
    const { store, preview, getContent, session } = makeSession({
      list: loadedList([snap("a", 10)]),
    });
    getContent.mockResolvedValue("content a");
    preview.enterPreview.mockImplementation(() => {
      throw new Error("render failed");
    });

    await expect(session.previewSnapshot("a")).rejects.toThrow("render failed");

    // The controller was asked to render, so the view stays on the snapshot
    // until it has been asked to leave.
    expect(store.state.view).toEqual({
      mode: "snapshot",
      snapshotId: "a",
      compareToId: undefined,
    });
    expect(store.state.loadingView).toBeUndefined();

    session.exitPreview();
    expect(preview.exitPreview).toHaveBeenCalledTimes(1);
    expect(store.state.view).toEqual({ mode: "live" });
  });

  it("marks the editor as loading only once a preview has taken a while", async () => {
    const { classList, getContent, session } = makeSession({
      list: loadedList([snap("a", 10)]),
    });
    const request = deferred<string>();
    getContent.mockReturnValue(request.promise);

    vi.useFakeTimers();
    try {
      const pending = session.previewSnapshot("a");
      // Not yet: a fast load must not flash a loading state.
      vi.advanceTimersByTime(LOADING_PREVIEW_DELAY_MS - 1);
      expect(classList.add).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(classList.add).toHaveBeenCalledTimes(1);
      expect(classList.add).toHaveBeenCalledWith(LOADING_PREVIEW_CLASS);

      request.resolve("content a");
      await pending;
      expect(classList.remove).toHaveBeenCalledWith(LOADING_PREVIEW_CLASS);

      // A load that ends before the delay never marks the editor.
      await session.previewSnapshot("a");
      vi.advanceTimersByTime(LOADING_PREVIEW_DELAY_MS);
      expect(classList.add).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not restart the loading timer on fast preview switches", async () => {
    const { classList, getContent, session } = makeSession({
      list: loadedList([snap("b", 20), snap("a", 10)]),
    });
    const aRequest = deferred<string>();
    const bRequest = deferred<string>();
    getContent.mockImplementation(async (snapshot) =>
      snapshot.id === "a" ? aRequest.promise : bRequest.promise,
    );

    vi.useFakeTimers();
    try {
      const first = session.previewSnapshot("a");
      vi.advanceTimersByTime(LOADING_PREVIEW_DELAY_MS - 1);
      const second = session.previewSnapshot("b");
      vi.advanceTimersByTime(1);

      // One delay across both previews: the class appears once, not per switch.
      expect(classList.add).toHaveBeenCalledTimes(1);
      expect(classList.add).toHaveBeenCalledWith(LOADING_PREVIEW_CLASS);

      bRequest.resolve("content b");
      await second;
      expect(classList.remove).toHaveBeenCalledWith(LOADING_PREVIEW_CLASS);

      aRequest.resolve("content a");
      await first;
      expect(classList.add).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears the delayed loader after a failed switch and can retry", async () => {
    const { store, preview, classList, getContent, session } = makeSession({
      list: loadedList([snap("shown", 20), snap("next", 10)]),
    });
    getContent.mockImplementation(async (snapshot) =>
      snapshot.id === "shown" ? "shown content" : "next content",
    );
    await session.previewSnapshot("shown");
    expect(preview.enterPreview).toHaveBeenCalledTimes(1);

    const firstAttempt = deferred<string>();
    getContent.mockReturnValueOnce(firstAttempt.promise);

    vi.useFakeTimers();
    try {
      const pending = session.previewSnapshot("next");
      vi.advanceTimersByTime(LOADING_PREVIEW_DELAY_MS);
      expect(classList.add).toHaveBeenCalledWith(LOADING_PREVIEW_CLASS);

      const failure = expect(pending).rejects.toThrow("offline");
      firstAttempt.reject(new Error("offline"));
      await failure;

      // Rolled back to what was rendered; the loader is cleared.
      expect(store.state.view).toEqual({
        mode: "snapshot",
        snapshotId: "shown",
        compareToId: undefined,
      });
      expect(store.state.loadingView).toBeUndefined();
      expect(classList.remove).toHaveBeenCalledWith(LOADING_PREVIEW_CLASS);

      // A retry succeeds.
      await session.previewSnapshot("next");
      expect(preview.enterPreview).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("exposes previewCurrentVersion only when serializeCurrentContent is provided", () => {
    const without = makeSession();
    expect(without.session.previewCurrentVersion).toBeUndefined();

    const withSerialize = makeSession({
      serializeCurrentContent: () => "live",
    });
    expect(withSerialize.session.previewCurrentVersion).toBeDefined();
  });

  it("previewCurrentVersion passes the current row as the target", async () => {
    const current = snap("current", 30, { by: ["u1"] });
    const stored = snap("a", 10);
    const serialize = vi.fn(() => "live content");
    const { store, preview, getContent, getAttributions, session } =
      makeSession({
        list: loadedList([stored], current),
        serializeCurrentContent: serialize,
      });
    getContent.mockResolvedValue("baseline content");
    getAttributions.mockResolvedValue(undefined);

    await session.previewCurrentVersion!({ compareTo: "a" });

    expect(serialize).toHaveBeenCalledTimes(1);
    expect(preview.enterPreview).toHaveBeenCalledWith(
      "live content",
      "baseline content",
      undefined,
      { target: { kind: "current", snapshot: current }, compareTo: stored },
    );
    expect(store.state.view).toEqual({ mode: "current", compareToId: "a" });
  });

  it("previewCurrentVersion requires the list to be loaded", async () => {
    const { session } = makeSession({
      list: { loaded: false },
      serializeCurrentContent: () => "live",
    });
    await expect(session.previewCurrentVersion!()).rejects.toThrow(
      "requires the version list to be loaded",
    );
  });
});
