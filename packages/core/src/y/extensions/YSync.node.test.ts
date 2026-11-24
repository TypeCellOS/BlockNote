import { pauseSync, ySyncPluginKey } from "@y/prosemirror";
import * as Y from "@y/y";
import { afterEach, expect } from "vite-plus/test";

import type { SetupEditor } from "../../../../../tests/src/commands/node/setupEditor.js";
import { withCollaboration } from "./index.js";
import { YSyncExtension } from "./YSync.js";
import { LoadingExtension } from "../../extensions/Loading/Loading.js";
import { blocksToYDoc } from "../utils.js";

class Provider {
  awareness = undefined;
  synced = false;
  listeners = new Set<(synced: boolean) => void>();

  on(_event: "synced", listener: (synced: boolean) => void) {
    this.listeners.add(listener);
  }
  off(_event: "synced", listener: (synced: boolean) => void) {
    this.listeners.delete(listener);
  }
  sync(synced = true) {
    this.synced = synced;
    for (const listener of this.listeners) {
      listener(synced);
    }
  }
}

async function setup(
  setupEditor: SetupEditor,
  provider?: { awareness?: undefined },
  disableExtensions: string[] = [],
  doc = new Y.Doc(),
) {
  cleanups.push(() => doc.destroy());
  const { editor } = await setupEditor(
    withCollaboration({
      disableExtensions,
      collaboration: {
        fragment: doc.get("doc"),
        provider,
        user: { name: "Test", color: "red" },
      },
    }),
  );
  const sync = editor.getExtension(YSyncExtension)!;
  // Exercise the real state plugin without a view so these tests isolate the
  // extension's mount hook from hydration and document reconciliation.
  editor.registerExtension({
    key: "headlessYSyncState",
    prosemirrorPlugins: sync.prosemirrorPlugins,
  });
  function mount() {
    const controller = new AbortController();
    sync.mount({ signal: controller.signal });
    cleanups.push(() => controller.abort());
    return controller;
  }
  const controller = mount();
  const loading = editor.getExtension(LoadingExtension)!;
  return { editor, doc, loading, controller, mount };
}

it("waits for the first successful sync", async ({ setupEditor }) => {
  const provider = new Provider();
  const { editor, doc, loading } = await setup(setupEditor, provider);
  expect(ySyncPluginKey.getState(editor.prosemirrorState)?.ytype).toBe(
    doc.get("doc"),
  );
  expect(doc.get("doc").length).toBe(0);
  expect(editor.isEditable).toBe(false);
  expect(loading.store.state.size).toBe(1);
  provider.sync(false);
  expect(editor.isEditable).toBe(false);
  provider.sync();
  expect(editor.isEditable).toBe(true);
  expect(loading.store.state.size).toBe(0);
});

it("unlocks when content arrives without a provider sync event", async ({
  setupEditor,
}) => {
  const provider = new Provider();
  const { editor, doc, loading } = await setup(setupEditor, provider);
  const cached = blocksToYDoc(
    editor,
    [{ type: "paragraph", content: "Cached" }],
    "doc",
  );
  cleanups.push(() => cached.destroy());
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(cached));
  expect(provider.synced).toBe(false);
  expect(ySyncPluginKey.getState(editor.prosemirrorState)?.ytype).toBe(
    doc.get("doc"),
  );
  expect(editor.isEditable).toBe(true);
  expect(loading.store.state.size).toBe(0);
});

it("stays editable after disconnect and remount with an empty fragment", async ({
  setupEditor,
}) => {
  const provider = new Provider();
  const { editor, doc, loading, controller, mount } = await setup(
    setupEditor,
    provider,
  );
  provider.sync();
  provider.sync(false);
  controller.abort();
  mount();
  expect(ySyncPluginKey.getState(editor.prosemirrorState)?.ytype).toBe(
    doc.get("doc"),
  );
  expect(editor.isEditable).toBe(true);
  expect(loading.store.state.size).toBe(0);
});

it("resumes waiting after remount and cleans up subscriptions on abort", async ({
  setupEditor,
}) => {
  const provider = new Provider();
  const { editor, loading, controller, mount } = await setup(
    setupEditor,
    provider,
  );
  controller.abort();
  expect(provider.listeners.size).toBe(0);
  expect(loading.store.state.size).toBe(0);
  mount();
  expect(provider.listeners.size).toBe(1);
  expect(editor.isEditable).toBe(false);
  expect(loading.store.state.size).toBe(1);
  provider.sync();
  expect(editor.isEditable).toBe(true);
  expect(loading.store.state.size).toBe(0);
});

it("accepts remote content after remounting while waiting for sync", async ({
  setupEditor,
}) => {
  const provider = new Provider();
  const { editor, doc, loading, controller, mount } = await setup(
    setupEditor,
    provider,
  );
  controller.abort();
  expect(provider.listeners.size).toBe(0);
  expect(loading.store.state.size).toBe(0);
  const remounted = mount();
  expect(provider.listeners.size).toBe(1);
  expect(loading.store.state.size).toBe(1);
  expect(editor.isEditable).toBe(false);
  expect(ySyncPluginKey.getState(editor.prosemirrorState)?.ytype).toBe(
    doc.get("doc"),
  );
  const remote = blocksToYDoc(
    editor,
    [{ type: "paragraph", content: "Remote content" }],
    "doc",
  );
  cleanups.push(() => remote.destroy());
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(remote));
  expect(provider.synced).toBe(false);
  expect(editor.isEditable).toBe(true);
  expect(loading.store.state.size).toBe(0);
  remounted.abort();
  expect(provider.listeners.size).toBe(0);
});

it("binds cached content immediately and stays editable on offline remount", async ({
  setupEditor,
}) => {
  const { editor: schema } = await setupEditor();
  const doc = blocksToYDoc(
    schema,
    [{ type: "paragraph", content: "Cached" }],
    "doc",
  );
  const provider = new Provider();
  const { editor, loading, controller, mount } = await setup(
    setupEditor,
    provider,
    [],
    doc,
  );
  expect(provider.synced).toBe(false);
  expect(provider.listeners.size).toBe(0);
  expect(editor.isEditable).toBe(true);
  expect(loading.store.state.size).toBe(0);
  expect(ySyncPluginKey.getState(editor.prosemirrorState)?.ytype).toBe(
    doc.get("doc"),
  );
  controller.abort();
  mount();
  expect(provider.synced).toBe(false);
  expect(provider.listeners.size).toBe(0);
  expect(editor.isEditable).toBe(true);
  expect(loading.store.state.size).toBe(0);
  expect(ySyncPluginKey.getState(editor.prosemirrorState)?.ytype).toBe(
    doc.get("doc"),
  );
});

it("does not override application read-only mode", async ({ setupEditor }) => {
  const provider = new Provider();
  const { editor, loading } = await setup(setupEditor, provider);
  editor.isEditable = false;
  provider.sync();
  expect(editor.isEditable).toBe(false);
  expect(loading.store.state.size).toBe(0);
});

it("does not wait for an already synced provider", async ({ setupEditor }) => {
  const provider = new Provider();
  provider.sync();
  const { editor, loading } = await setup(setupEditor, provider);
  expect(editor.isEditable).toBe(true);
  expect(loading.store.state.size).toBe(0);
});

it("syncs and remounts without a Loading extension", async ({
  setupEditor,
}) => {
  const provider = new Provider();
  const { editor, doc, controller, mount } = await setup(
    setupEditor,
    provider,
    ["loading"],
  );
  expect(editor.getExtension(LoadingExtension)).toBeUndefined();
  expect(ySyncPluginKey.getState(editor.prosemirrorState)?.ytype).toBe(
    doc.get("doc"),
  );
  provider.sync();
  provider.sync(false);
  controller.abort();
  expect(provider.listeners.size).toBe(0);
  mount();
  expect(provider.listeners.size).toBe(0);
  expect(editor.isEditable).toBe(true);
});

it.for([undefined, { awareness: undefined }])(
  "allows immediate editing without a sync signal: %j",
  async (provider, { setupEditor }) => {
    const { editor, loading } = await setup(setupEditor, provider);
    expect(editor.isEditable).toBe(true);
    expect(loading.store.state.size).toBe(0);
  },
);

it("keeps other loading tokens active when sync finishes", async ({
  setupEditor,
}) => {
  const provider = new Provider();
  const { editor, loading } = await setup(setupEditor, provider);
  const release = loading.acquire();
  const releaseOther = loading.acquire();
  provider.sync();
  expect(loading.store.state.size).toBe(2);
  expect(editor.isEditable).toBe(false);
  release();
  release();
  expect(loading.store.state.size).toBe(1);
  expect(editor.isEditable).toBe(false);
  releaseOther();
  expect(loading.store.state.size).toBe(0);
  expect(editor.isEditable).toBe(true);
});

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    cleanup();
  }
});

it.for([false, true])(
  "ignores sync callbacks after unmount (off supported: %s)",
  async (removableSyncListener, { setupEditor }) => {
    const listeners = new Set<(synced: boolean) => void>();
    const provider = {
      awareness: undefined,
      synced: false,
      on(_event: string, callback: (synced: boolean) => void) {
        listeners.add(callback);
      },
      ...(removableSyncListener
        ? {
            off(_event: string, callback: (synced: boolean) => void) {
              listeners.delete(callback);
            },
          }
        : {}),
    };
    const { controller, doc, editor } = await setup(setupEditor, provider);
    const fragment = doc.get("doc");
    expect(listeners.size).toBe(1);
    const callback = [...listeners][0];
    callback(true);
    expect(ySyncPluginKey.getState(editor.prosemirrorState)?.ytype).toBe(
      fragment,
    );
    editor.exec((state, dispatch) => pauseSync(state, dispatch ?? null));
    controller.abort();
    if (removableSyncListener) {
      expect(listeners.size).toBe(0);
    }
    callback(true);
    expect(ySyncPluginKey.getState(editor.prosemirrorState)?.ytype).toBeNull();
  },
);
