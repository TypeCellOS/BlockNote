import { createExtension } from "@blocknote/core";
import { expect, it, vi, type TestContext } from "vite-plus/test";
import { createSetupEditor } from "../../commands/browser/setupEditor.js";
import { acquireTiptapFixtureStyles } from "../../commands/browser/tiptapFixtureStyles.js";

const selector = "style[data-tiptap-style]";

function sheets(doc = document) {
  return Array.from(doc.head.querySelectorAll<HTMLStyleElement>(selector));
}

function expectSheets(expected: HTMLStyleElement[], doc = document) {
  const actual = sheets(doc);
  expect(actual).toHaveLength(expected.length);
  for (const [index, sheet] of expected.entries()) {
    expect(actual[index]).toBe(sheet);
  }
}

function createSheet(doc = document) {
  const sheet = doc.createElement("style");
  sheet.setAttribute("data-tiptap-style", "");
  return sheet;
}

function fixture(context: TestContext, mountType: "react" | "dom" | false) {
  const pending = new Set<Parameters<TestContext["onTestFinished"]>[0]>();
  context.onTestFinished(dispose);
  function register(cleanup: Parameters<TestContext["onTestFinished"]>[0]) {
    pending.add(cleanup);
  }
  const setupEditor = createSetupEditor(register);

  async function dispose() {
    for (const cleanup of pending) {
      pending.delete(cleanup);
      await cleanup(context);
    }
  }
  return {
    mount: () =>
      mountType === "react"
        ? setupEditor({ mountType, skin: "raw" })
        : setupEditor({ mountType }),
    setupEditor,
    dispose,
  };
}

it("creates a headless editor without mounting a view or acquiring styles", async (context) => {
  const baseline = sheets();
  const before = Array.from(document.body.children);
  const headless = fixture(context, false);
  const { editor } = await headless.mount();
  const destroy = vi.fn();
  editor.on("destroy", destroy);

  expect(editor.domElement).toBeUndefined();
  expect(Array.from(document.body.children)).toEqual(before);
  expectSheets(baseline);

  await headless.dispose();
  expect(destroy).toHaveBeenCalledTimes(1);
  expectSheets(baseline);
});

it("restores the fixture-owned sheet until the last lease releases, even when teardown throws", () => {
  const doc = document.implementation.createHTMLDocument();
  const unrelated = doc.createElement("style");
  const owned = createSheet(doc);
  const after = doc.createComment("after TipTap");
  doc.head.append(unrelated);

  const first = acquireTiptapFixtureStyles(doc);
  first.track(() => doc.head.append(owned));
  const second = acquireTiptapFixtureStyles(doc);
  doc.head.append(after);

  first.dispose(() => {
    expectSheets([owned], doc);
    // TipTap may remove the shared sheet when it sees no connected views.
    owned.remove();
  });
  expectSheets([owned], doc);
  expect(owned.previousSibling).toBe(unrelated);
  expect(owned.nextSibling).toBe(after);

  const failure = new Error("teardown failed");
  expect(() =>
    second.dispose(() => {
      expectSheets([owned], doc);
      throw failure;
    }),
  ).toThrow(failure);
  expect(owned.parentNode).toBeNull();
  expectSheets([], doc);
  expect(unrelated.parentNode).toBe(doc.head);
  expect(unrelated.nextSibling).toBe(after);
});

it("does not reclaim a sheet a previous fixture handed off to a separate view", () => {
  const doc = document.implementation.createHTMLDocument();
  const shared = createSheet(doc);
  const externalView = doc.createElement("div");
  externalView.className = "tiptap";

  const first = acquireTiptapFixtureStyles(doc);
  first.track(() => doc.head.append(shared));
  doc.body.append(externalView);
  first.dispose(() => {});
  expectSheets([shared], doc);

  const later = acquireTiptapFixtureStyles(doc);
  externalView.remove();
  later.dispose(() => shared.remove());
  expectSheets([shared], doc);
});

it.for(["react", "dom"] as const)(
  "keeps the fixture stylesheet when a %s fixture releases first",
  async (firstPath, context) => {
    const baseline = sheets();
    const first = fixture(context, firstPath);
    const second = fixture(context, firstPath === "react" ? "dom" : "react");
    const { editor: firstEditor } = await first.mount();
    const firstView = firstEditor.domElement;
    const [shared] = sheets();
    expect(shared).toBeDefined();
    const { editor: secondEditor } = await second.mount();
    const secondView = secondEditor.domElement;

    await first.dispose();
    expect(firstView?.isConnected).toBe(false);
    expect(secondView?.isConnected).toBe(true);
    expect(sheets()[0]).toBe(shared);

    await second.dispose();
    expect(secondView?.isConnected).toBe(false);
    expectSheets(baseline);
  },
);

it.for(["react", "dom"] as const)(
  "preserves a borrowed stylesheet when a %s fixture releases first",
  async (firstPath, context) => {
    const borrowed = createSheet();
    const separator = document.createComment("between borrowed TipTap styles");
    const otherBorrowed = createSheet();
    context.onTestFinished(() => {
      borrowed.remove();
      separator.remove();
      otherBorrowed.remove();
    });
    document.head.prepend(borrowed, separator, otherBorrowed);
    const baseline = sheets();

    const first = fixture(context, firstPath);
    const second = fixture(context, firstPath === "react" ? "dom" : "react");
    await first.mount();
    const { editor } = await second.mount();
    await first.dispose();
    expect(editor.domElement?.isConnected).toBe(true);
    expect(sheets()[0]).toBe(borrowed);

    await second.dispose();
    expectSheets(baseline);
    expect(borrowed.nextSibling).toBe(separator);
    expect(separator.nextSibling).toBe(otherBorrowed);
  },
);

it("retains the stylesheet while the surviving fixture is between mounts", async (context) => {
  const baseline = sheets();
  const react = fixture(context, "react");
  const core = fixture(context, "dom");
  const destroy = vi.fn();
  let showEditor = true;
  const { editor, rerender, rootNode } = await react.setupEditor({
    skin: "raw",
    outside: ({ children }) => (showEditor ? children : null),
  });
  editor.on("destroy", () => destroy(editor.domElement, rootNode.isConnected));
  const [shared] = sheets();
  expect(shared).toBeDefined();
  await core.mount();

  showEditor = false;
  rerender({});
  expect(editor.domElement).toBeUndefined();
  await core.dispose();
  expect(sheets()[0]).toBe(shared);
  expect(destroy).not.toHaveBeenCalled();

  showEditor = true;
  rerender({});
  expect(editor.domElement?.isConnected).toBe(true);
  expect(sheets()[0]).toBe(shared);
  await react.dispose();
  expect(destroy).toHaveBeenCalledExactlyOnceWith(undefined, true);
  expect(rootNode.isConnected).toBe(false);
  expectSheets(baseline);
});

it("releases a partially mounted Core fixture without affecting its React peer", async (context) => {
  const baseline = sheets();
  const peer = fixture(context, "react");
  const { editor } = await peer.mount();
  const [shared] = sheets();
  expect(shared).toBeDefined();
  const destroy = vi.fn();
  const failure = new Error("Core mount failed");
  let host: HTMLElement | undefined;
  let mountSignal: AbortSignal | undefined;
  const FailingExtension = createExtension(({ editor }) => {
    editor.on("destroy", () => destroy(host?.isConnected));
    return {
      key: "failing-mount",
      mount: ({ dom, signal }) => {
        host = dom;
        mountSignal = signal;
        throw failure;
      },
    };
  });

  const failed = fixture(context, "dom");
  await expect(
    failed.setupEditor({ mountType: "dom", extensions: [FailingExtension()] }),
  ).rejects.toBe(failure);
  expect(host?.isConnected).toBe(false);
  expect(mountSignal?.aborted).toBe(true);
  expect(destroy).toHaveBeenCalledExactlyOnceWith(true);
  expect(editor.domElement?.isConnected).toBe(true);
  expect(sheets()[0]).toBe(shared);

  await failed.dispose();
  expect(destroy).toHaveBeenCalledTimes(1);
  await peer.dispose();
  expectSheets(baseline);
});

it("releases a React fixture that fails while preparing children", async (context) => {
  const before = Array.from(document.body.children);
  const destroy = vi.fn();
  const failure = new Error("React children failed");
  const failed = fixture(context, "react");
  await expect(
    failed.setupEditor({
      skin: "raw",
      children: ({ editor }) => {
        editor.on("destroy", destroy);
        throw failure;
      },
    }),
  ).rejects.toBe(failure);

  expect(destroy).toHaveBeenCalledTimes(1);
  expect(Array.from(document.body.children)).toEqual(before);
});
