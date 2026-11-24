import { describe, expect, type TestContext, vi } from "vite-plus/test";

import type { BlockNoteEditor } from "../BlockNoteEditor.js";

function appendToRegisteredPortalElement(
  onTestFinished: TestContext["onTestFinished"],
  editor: Pick<
    BlockNoteEditor,
    "registerPortalElement" | "unregisterPortalElement"
  >,
  ...elements: HTMLElement[]
) {
  const root = document.createElement("div");
  document.body.append(root);
  onTestFinished(() => {
    editor.unregisterPortalElement(root);
    root.remove();
  });
  editor.registerPortalElement(root);
  root.append(...elements);
}

// Focus tracking is almost entirely DOM semantics — event ordering, what
// `document.activeElement` reads as at each step, and how focus behaves when
// it moves into UI that is portalled outside the editor. None of that is
// reproducible in jsdom, so these run in the browser suite across all three
// engines.

function settleFocus(action: () => void) {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  try {
    action();
    // Run the tracker and the harness's selection-reconciliation barrier
    // before restoring real time; leaving either pending stalls teardown.
    vi.runOnlyPendingTimers();
  } finally {
    vi.useRealTimers();
  }
}

describe("Focus events", () => {
  const it = globalThis.it.extend<{
    mountEditor: () => Promise<BlockNoteEditor>;
    editor: BlockNoteEditor;
    outside: HTMLInputElement;
  }>({
    mountEditor: async ({ setupEditor, onTestFinished }, use) => {
      await use(async () => {
        const { editor } = await setupEditor({ mountType: false });
        // The mount element's parent is the editor's focus boundary. A separate
        // container keeps an outside input or a second editor out of that boundary.
        const editorContainer = document.createElement("div");
        const mountPoint = document.createElement("div");
        editorContainer.append(mountPoint);
        document.body.append(editorContainer);
        onTestFinished(() => {
          try {
            editor.unmount();
          } finally {
            editorContainer.remove();
          }
        });
        editor.mount(mountPoint);
        return editor;
      });
    },
    editor: async ({ mountEditor }, use) => {
      await use(await mountEditor());
    },
    outside: async ({ onTestFinished }, use) => {
      const outside = document.createElement("input");
      outside.id = "outside";
      document.body.append(outside);
      onTestFinished(() => outside.remove());
      await use(outside);
    },
  });

  /**
   * The DOM contract the tracker is built on
   * (https://developer.mozilla.org/en-US/docs/Web/API/FocusEvent#order_of_events).
   * If a future engine changes this ordering, the tracker's "settle
   * immediately on focusin, defer on focusout" split stops being valid — so
   * it's asserted rather than assumed.
   */
  it("follows the documented focus event order", ({ onTestFinished }) => {
    const a = document.createElement("input");
    const b = document.createElement("input");
    document.body.append(a, b);
    onTestFinished(() => {
      a.remove();
      b.remove();
    });
    const order: string[] = [];
    for (const [name, element] of [
      ["a", a],
      ["b", b],
    ] as const) {
      for (const type of ["blur", "focusout", "focus", "focusin"]) {
        element.addEventListener(type, () => order.push(`${type}:${name}`));
      }
    }

    a.focus();
    order.length = 0;
    b.focus();

    expect(order).toEqual(["blur:a", "focusout:a", "focus:b", "focusin:b"]);
  });

  /**
   * Why the focusout side has to be deferred: at focusout time the outgoing
   * element has *already* lost focus and `document.activeElement` reads as
   * `<body>`, so the destination isn't knowable yet. (`relatedTarget` can't
   * substitute — MDN documents it as null in cases like tabbing out of the
   * page, and it is unreliable on mobile.)
   */
  it("reports <body> as the active element during focusout", ({
    onTestFinished,
  }) => {
    const a = document.createElement("input");
    document.body.append(a);
    onTestFinished(() => a.remove());
    let activeDuringFocusOut: Element | null = null;
    a.addEventListener("focusout", () => {
      activeDuringFocusOut = document.activeElement;
    });

    a.focus();
    a.blur();

    expect(activeDuringFocusOut).toBe(document.body);
  });

  it("isFocused() tracks the content area", ({ editor, outside }) => {
    expect(editor.isFocused()).toBe(false);

    editor.focus();
    expect(editor.isFocused()).toBe(true);

    outside.focus();
    expect(editor.isFocused()).toBe(false);
  });

  it("isFocused({ includeEditorUI }) counts the editor's own UI", ({
    editor,
    outside,
    onTestFinished,
  }) => {
    // The portal element is where menus, toolbars and popovers render — it
    // lives outside the content area, so plain content focus can't see it.
    const popoverInput = document.createElement("input");
    appendToRegisteredPortalElement(onTestFinished, editor, popoverInput);

    popoverInput.focus();

    expect(editor.isFocused()).toBe(false);
    expect(editor.isFocused({ includeEditorUI: true })).toBe(true);

    outside.focus();
    expect(editor.isFocused({ includeEditorUI: true })).toBe(false);
  });

  it("onFocusChange reports content focus and blur", ({
    editor,
    outside,
    onTestFinished,
  }) => {
    const events: boolean[] = [];
    onTestFinished(
      editor.onFocusChange((_editor, ctx) => events.push(ctx.focused)),
    );

    editor.focus();
    outside.focus();

    expect(events).toEqual([true, false]);
  });

  it("onFocusChange({ includeEditorUI }) stays focused across a handoff into the editor's UI", ({
    editor,
    outside,
    onTestFinished,
  }) => {
    const popoverInput = document.createElement("input");
    appendToRegisteredPortalElement(onTestFinished, editor, popoverInput);

    const events: boolean[] = [];
    onTestFinished(
      editor.onFocusChange((_editor, ctx) => events.push(ctx.focused), {
        includeEditorUI: true,
      }),
    );

    editor.focus();
    expect(events).toEqual([true]);
    // Content -> a popover input. This is the handoff that matters: the raw
    // channel would report a blur here, which is what used to tear the mobile
    // toolbar (and the popover with it) down mid-interaction.
    settleFocus(() => popoverInput.focus());

    expect(events.at(-1)).toBe(true);
    expect(events).not.toContain(false);

    // Leaving the editor entirely does report a blur.
    settleFocus(() => outside.focus());
    expect(events.at(-1)).toBe(false);
  });

  it("does not report a spurious blur while focus moves between UI elements", ({
    editor,
    outside,
    onTestFinished,
  }) => {
    const first = document.createElement("input");
    const second = document.createElement("input");
    appendToRegisteredPortalElement(onTestFinished, editor, first, second);

    editor.focus();

    const events: boolean[] = [];
    onTestFinished(
      editor.onFocusChange((_editor, ctx) => events.push(ctx.focused), {
        includeEditorUI: true,
      }),
    );

    settleFocus(() => first.focus());
    settleFocus(() => second.focus());
    settleFocus(() => editor.focus());

    expect(events).toEqual([]);
    settleFocus(() => outside.focus());
    expect(events).toEqual([false]);
  });

  it("ignores focus changes that never involve the editor", ({
    editor,
    onTestFinished,
  }) => {
    // The tracker listens at the document level, so it sees every focus
    // change on the page — including ones with nothing to do with this
    // editor. Those must not reach subscribers.
    const otherA = document.createElement("input");
    const otherB = document.createElement("input");
    document.body.append(otherA, otherB);
    onTestFinished(() => {
      otherA.remove();
      otherB.remove();
    });

    const events: boolean[] = [];
    onTestFinished(
      editor.onFocusChange((_editor, ctx) => events.push(ctx.focused), {
        includeEditorUI: true,
      }),
    );

    settleFocus(() => otherA.focus());
    settleFocus(() => otherB.focus());

    expect(events).toEqual([]);
  });

  it("keeps two editors on one page independent", async ({
    editor,
    mountEditor,
    onTestFinished,
  }) => {
    const other = await mountEditor();

    const events: boolean[] = [];
    onTestFinished(
      editor.onFocusChange((_editor, ctx) => events.push(ctx.focused), {
        includeEditorUI: true,
      }),
    );

    settleFocus(() => other.focus());

    expect(other.isFocused()).toBe(true);
    expect(editor.isFocused({ includeEditorUI: true })).toBe(false);
    expect(events).toEqual([]);
  });

  it("stops delivering events after unsubscribing", ({
    editor,
    outside,
    onTestFinished,
  }) => {
    const events: boolean[] = [];
    const unsubscribe = editor.onFocusChange(
      (_editor, ctx) => events.push(ctx.focused),
      { includeEditorUI: true },
    );
    onTestFinished(unsubscribe);

    editor.focus();
    const countWhileSubscribed = events.length;
    expect(countWhileSubscribed).toBeGreaterThan(0);

    unsubscribe();
    settleFocus(() => outside.focus());
    settleFocus(() => editor.focus());

    expect(events.length).toBe(countWhileSubscribed);
  });

  it("survives an unsubscribe being called twice", ({
    editor,
    onTestFinished,
  }) => {
    // The count backing the shared document listeners is reference-counted.
    // A second call to the same unsubscribe used to drive it negative, so it
    // never reached 1 again and the tracker silently stopped attaching for
    // every later subscriber — with no error to notice.
    const stale = editor.onFocusChange(() => {}, { includeEditorUI: true });
    stale();
    stale();

    const events: boolean[] = [];
    onTestFinished(
      editor.onFocusChange((_editor, ctx) => events.push(ctx.focused), {
        includeEditorUI: true,
      }),
    );

    editor.focus();

    expect(events).toEqual([true]);
  });

  it("supports several subscribers independently", ({
    editor,
    outside,
    onTestFinished,
  }) => {
    const first: boolean[] = [];
    const second: boolean[] = [];
    const unsubscribeFirst = editor.onFocusChange(
      (_editor, ctx) => first.push(ctx.focused),
      { includeEditorUI: true },
    );
    onTestFinished(unsubscribeFirst);
    onTestFinished(
      editor.onFocusChange((_editor, ctx) => second.push(ctx.focused), {
        includeEditorUI: true,
      }),
    );

    editor.focus();
    expect(first.length).toBeGreaterThan(0);
    expect(second.length).toBe(first.length);

    // The document listeners are shared and reference-counted, so dropping
    // one subscriber must not stop the other's events.
    unsubscribeFirst();
    const firstCount = first.length;
    settleFocus(() => outside.focus());

    expect(first.length).toBe(firstCount);
    expect(second.at(-1)).toBe(false);
  });
});
