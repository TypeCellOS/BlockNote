import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../BlockNoteEditor.js";

// Focus tracking is almost entirely DOM semantics — event ordering, what
// `document.activeElement` reads as at each step, and how focus behaves when
// it moves into UI that is portalled outside the editor. None of that is
// reproducible in jsdom, so these run in the browser suite across all three
// engines.

/** Resolves once the deferred focus settle has run (see attachUIFocusTracker). */
function settle() {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

describe("Focus events", () => {
  let editor: BlockNoteEditor<any, any, any>;
  let container: HTMLElement;
  let outside: HTMLInputElement;

  /**
   * Mounts an editor inside its own container, mirroring how `BlockNoteView`
   * renders it. The nesting matters: `isWithinEditor` — which `isFocused`
   * and the focus events are built on — treats the mount element's *parent*
   * as the editor's boundary, so that it also covers UI rendered as a
   * sibling of the content area. Mounting straight into `<body>` would make
   * that boundary the whole page.
   */
  function mountEditor() {
    const editorContainer = document.createElement("div");
    const mountPoint = document.createElement("div");
    editorContainer.append(mountPoint);
    document.body.append(editorContainer);
    const instance = BlockNoteEditor.create();
    instance.mount(mountPoint);
    return { editor: instance, container: editorContainer };
  }

  beforeEach(() => {
    outside = document.createElement("input");
    outside.id = "outside";
    document.body.append(outside);

    ({ editor, container } = mountEditor());
  });

  afterEach(() => {
    editor.unmount();
    container.remove();
    outside.remove();
  });

  /**
   * The DOM contract the tracker is built on
   * (https://developer.mozilla.org/en-US/docs/Web/API/FocusEvent#order_of_events).
   * If a future engine changes this ordering, the tracker's "settle
   * immediately on focusin, defer on focusout" split stops being valid — so
   * it's asserted rather than assumed.
   */
  it("follows the documented focus event order", async () => {
    const a = document.createElement("input");
    const b = document.createElement("input");
    document.body.append(a, b);
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

    a.remove();
    b.remove();
  });

  /**
   * Why the focusout side has to be deferred: at focusout time the outgoing
   * element has *already* lost focus and `document.activeElement` reads as
   * `<body>`, so the destination isn't knowable yet. (`relatedTarget` can't
   * substitute — MDN documents it as null in cases like tabbing out of the
   * page, and it is unreliable on mobile.)
   */
  it("reports <body> as the active element during focusout", async () => {
    const a = document.createElement("input");
    document.body.append(a);
    let activeDuringFocusOut: Element | null = null;
    a.addEventListener("focusout", () => {
      activeDuringFocusOut = document.activeElement;
    });

    a.focus();
    a.blur();

    expect(activeDuringFocusOut).toBe(document.body);
    a.remove();
  });

  it("isFocused() tracks the content area", async () => {
    expect(editor.isFocused()).toBe(false);

    editor.focus();
    expect(editor.isFocused()).toBe(true);

    outside.focus();
    expect(editor.isFocused()).toBe(false);
  });

  it("isFocused({ includeEditorUI }) counts the editor's own UI", async () => {
    // The portal element is where menus, toolbars and popovers render — it
    // lives outside the content area, so plain content focus can't see it.
    const popoverInput = document.createElement("input");
    editor.portalElement.append(popoverInput);

    popoverInput.focus();

    expect(editor.isFocused()).toBe(false);
    expect(editor.isFocused({ includeEditorUI: true })).toBe(true);

    outside.focus();
    expect(editor.isFocused({ includeEditorUI: true })).toBe(false);

    popoverInput.remove();
  });

  it("onFocusChange reports content focus and blur", async () => {
    const events: boolean[] = [];
    const unsubscribe = editor.onFocusChange((_editor, ctx) =>
      events.push(ctx.focused),
    );

    editor.focus();
    await settle();
    outside.focus();
    await settle();

    expect(events).toEqual([true, false]);
    unsubscribe();
  });

  it("onFocusChange({ includeEditorUI }) stays focused across a handoff into the editor's UI", async () => {
    const popoverInput = document.createElement("input");
    editor.portalElement.append(popoverInput);

    const events: boolean[] = [];
    const unsubscribe = editor.onFocusChange(
      (_editor, ctx) => events.push(ctx.focused),
      { includeEditorUI: true },
    );

    editor.focus();
    await settle();
    // Content -> a popover input. This is the handoff that matters: the raw
    // channel would report a blur here, which is what used to tear the mobile
    // toolbar (and the popover with it) down mid-interaction.
    popoverInput.focus();
    await settle();

    expect(events.at(-1)).toBe(true);
    expect(events).not.toContain(false);

    // Leaving the editor entirely does report a blur.
    outside.focus();
    await settle();
    expect(events.at(-1)).toBe(false);

    unsubscribe();
    popoverInput.remove();
  });

  it("does not report a spurious blur while focus moves between UI elements", async () => {
    const first = document.createElement("input");
    const second = document.createElement("input");
    editor.portalElement.append(first, second);

    editor.focus();
    await settle();

    const events: boolean[] = [];
    const unsubscribe = editor.onFocusChange(
      (_editor, ctx) => events.push(ctx.focused),
      { includeEditorUI: true },
    );

    first.focus();
    second.focus();
    editor.focus();
    await settle();

    expect(events).not.toContain(false);

    unsubscribe();
    first.remove();
    second.remove();
  });

  it("ignores focus changes that never involve the editor", async () => {
    // The tracker listens at the document level, so it sees every focus
    // change on the page — including ones with nothing to do with this
    // editor. Those must not reach subscribers.
    const otherA = document.createElement("input");
    const otherB = document.createElement("input");
    document.body.append(otherA, otherB);

    const events: boolean[] = [];
    const unsubscribe = editor.onFocusChange(
      (_editor, ctx) => events.push(ctx.focused),
      { includeEditorUI: true },
    );

    otherA.focus();
    await settle();
    otherB.focus();
    await settle();

    expect(events).toEqual([]);

    unsubscribe();
    otherA.remove();
    otherB.remove();
  });

  it("keeps two editors on one page independent", async () => {
    const { editor: other, container: otherContainer } = mountEditor();

    const events: boolean[] = [];
    const unsubscribe = editor.onFocusChange(
      (_editor, ctx) => events.push(ctx.focused),
      { includeEditorUI: true },
    );

    other.focus();
    await settle();

    expect(other.isFocused()).toBe(true);
    expect(editor.isFocused({ includeEditorUI: true })).toBe(false);
    expect(events).toEqual([]);

    unsubscribe();
    other.unmount();
    otherContainer.remove();
  });

  it("stops delivering events after unsubscribing", async () => {
    const events: boolean[] = [];
    const unsubscribe = editor.onFocusChange(
      (_editor, ctx) => events.push(ctx.focused),
      { includeEditorUI: true },
    );

    editor.focus();
    await settle();
    const countWhileSubscribed = events.length;
    expect(countWhileSubscribed).toBeGreaterThan(0);

    unsubscribe();
    outside.focus();
    await settle();
    editor.focus();
    await settle();

    expect(events.length).toBe(countWhileSubscribed);
  });

  it("supports several subscribers independently", async () => {
    const first: boolean[] = [];
    const second: boolean[] = [];
    const unsubscribeFirst = editor.onFocusChange(
      (_editor, ctx) => first.push(ctx.focused),
      { includeEditorUI: true },
    );
    const unsubscribeSecond = editor.onFocusChange(
      (_editor, ctx) => second.push(ctx.focused),
      { includeEditorUI: true },
    );

    editor.focus();
    await settle();
    expect(first.length).toBeGreaterThan(0);
    expect(second.length).toBe(first.length);

    // The document listeners are shared and reference-counted, so dropping
    // one subscriber must not stop the other's events.
    unsubscribeFirst();
    const firstCount = first.length;
    outside.focus();
    await settle();

    expect(first.length).toBe(firstCount);
    expect(second.at(-1)).toBe(false);

    unsubscribeSecond();
  });
});
