/* eslint-disable react/refs -- This browser test records render history. */
import type { BlockNoteEditor } from "@blocknote/core";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { describe, expect, type TestContext, vi } from "vite-plus/test";
import { installBrowserNoMotion } from "../../../../tests/src/commands/browser/installBrowserTestStyles.js";
import { useEditorFocus } from "./useEditorFocus.js";

function appendToRegisteredPortalElement(
  editor: Pick<
    BlockNoteEditor,
    "registerPortalElement" | "unregisterPortalElement"
  >,
  input: HTMLElement,
  onTestFinished: TestContext["onTestFinished"],
) {
  const root = document.createElement("div");
  onTestFinished(() => {
    try {
      editor.unregisterPortalElement(root);
    } finally {
      root.remove();
    }
  });
  root.append(input);
  document.body.appendChild(root);
  editor.registerPortalElement(root);
}

// `useEditorFocus` returns focus as state. What
// needs proving is that it reports *settled* focus and doesn't re-render on
// every focus event in the page — the reasons it exists rather than each
// consumer wiring up useState + useEffect itself. Focus semantics are real
// DOM behaviour, so this is a browser unit test rather than a jsdom one.

function Readout(props: { includeEditorUI: boolean }) {
  const focused = useEditorFocus({ includeEditorUI: props.includeEditorUI });
  const renders = useRef(0);
  renders.current += 1;
  // Every value ever rendered, so a single wrong frame is caught even when a
  // later render corrects it.
  const history = useRef<boolean[]>([]);
  history.current.push(focused);
  return (
    <div
      data-test="readout"
      data-focused={String(focused)}
      data-renders={String(renders.current)}
      data-history={history.current.join(",")}
    />
  );
}

function readout() {
  return document.querySelector<HTMLElement>('[data-test="readout"]')!;
}

function focusedValue() {
  return readout().dataset.focused;
}

function nextTask() {
  // The focus tracker settles blur in a zero-delay timer. To assert that
  // nothing changes, wait for that turn rather than polling a stale value.
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function addOutsideInput(onTestFinished: TestContext["onTestFinished"]) {
  const input = document.createElement("input");
  onTestFinished(() => input.remove());
  document.body.append(input);
  return input;
}

describe("useEditorFocus", () => {
  it("reports content focus and blur", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { editor } = await setupEditor({
      skin: "raw",
      children: <Readout includeEditorUI={false} />,
    });
    expect(focusedValue()).toBe("false");

    editor!.focus();
    await vi.waitFor(() => expect(focusedValue()).toBe("true"));

    addOutsideInput(onTestFinished).focus();
    await vi.waitFor(() => expect(focusedValue()).toBe("false"));
  });

  it("with includeEditorUI, stays focused across a handoff into the editor's UI", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { editor } = await setupEditor({
      skin: "raw",
      children: <Readout includeEditorUI />,
    });
    editor!.focus();
    await vi.waitFor(() => expect(focusedValue()).toBe("true"));

    // A popover input, portalled outside the content area.
    const popoverInput = document.createElement("input");
    appendToRegisteredPortalElement(editor, popoverInput, onTestFinished);
    popoverInput.focus();

    // Give the settle a chance to run, then confirm it never dropped.
    await nextTask();
    expect(focusedValue()).toBe("true");

    addOutsideInput(onTestFinished).focus();
    await vi.waitFor(() => expect(focusedValue()).toBe("false"));
  });

  it("changing includeEditorUI re-reads instead of rendering a stale frame", async ({
    setupEditor,
    onTestFinished,
  }) => {
    // The cached snapshot is keyed by its inputs. Without that, flipping the
    // option while focus sits in the editor's UI renders one frame computed
    // for the *old* option (false) before the new subscription re-syncs —
    // the history would read "...,false,true" after the flip.
    function FlippableProbe() {
      const [includeEditorUI, setIncludeEditorUI] = useState(false);
      return (
        <>
          <Readout includeEditorUI={includeEditorUI} />
          <button data-test="flip" onClick={() => setIncludeEditorUI(true)}>
            flip
          </button>
        </>
      );
    }
    const { editor } = await setupEditor({
      skin: "raw",
      children: <FlippableProbe />,
    });

    // Focus the editor's UI: raw content focus reads false, UI focus true.
    const popoverInput = document.createElement("input");
    appendToRegisteredPortalElement(editor, popoverInput, onTestFinished);
    popoverInput.focus();
    await nextTask();
    expect(focusedValue()).toBe("false");
    const historyBefore = readout().dataset.history!;

    document.querySelector<HTMLElement>('[data-test="flip"]')!.click();
    await vi.waitFor(() => expect(focusedValue()).toBe("true"));

    const flipped = readout()
      .dataset.history!.slice(historyBefore.length)
      .split(",")
      .filter(Boolean);
    expect(
      flipped,
      "the first frame after the flip must already read the new option",
    ).not.toContain("false");
  });

  it.for(["before", "after"] as const)(
    "observes focus in a portal registered %s attachment to a closed shadow root",
    async (registrationTime, { setupEditor, onTestFinished }) => {
      const { editor } = await setupEditor({
        skin: "raw",
        children: <Readout includeEditorUI />,
      });
      const shadowHost = document.createElement("div");
      onTestFinished(() => shadowHost.remove());
      document.body.append(shadowHost);
      const shadow = shadowHost.attachShadow({ mode: "closed" });
      onTestFinished(installBrowserNoMotion(shadow));
      const portal = document.createElement("div");
      const input = document.createElement("input");
      const outside = document.createElement("input");
      portal.append(input);
      if (registrationTime === "after") {
        shadow.append(portal);
      }
      const removeListener = vi.spyOn(portal, "removeEventListener");
      try {
        // Duplicate registrations must not duplicate listeners or release them early.
        editor!.registerPortalElement(portal);
        editor!.registerPortalElement(portal);
        editor!.unregisterPortalElement(portal);
        expect(removeListener).not.toHaveBeenCalled();
        shadow.append(portal, outside);

        outside.focus();
        expect(focusedValue()).toBe("false");
        input.focus();
        await vi.waitFor(() => expect(focusedValue()).toBe("true"));
        outside.focus();
        await vi.waitFor(() => expect(focusedValue()).toBe("false"));
        editor!.unregisterPortalElement(portal);
        expect(editor!.isWithinEditor(input)).toBe(false);
        expect(removeListener).toHaveBeenCalledTimes(2);
        expect(removeListener).toHaveBeenCalledWith(
          "focusin",
          expect.any(Function),
          true,
        );
        expect(removeListener).toHaveBeenCalledWith(
          "focusout",
          expect.any(Function),
          true,
        );
      } finally {
        removeListener.mockRestore();
        // Redundant unregisters are no-ops; also release if an assertion failed.
        editor!.unregisterPortalElement(portal);
        editor!.unregisterPortalElement(portal);
      }
    },
  );

  it("does not re-render for focus changes elsewhere on the page", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { editor } = await setupEditor({
      skin: "raw",
      children: <Readout includeEditorUI />,
    });
    editor!.focus();
    await vi.waitFor(() => expect(focusedValue()).toBe("true"));

    const rendersBefore = Number(readout().dataset.renders);
    const a = addOutsideInput(onTestFinished);
    const b = addOutsideInput(onTestFinished);
    // Focus bouncing between two unrelated inputs: the editor goes unfocused
    // once, and must not re-render for every subsequent hop.
    a.focus();
    await vi.waitFor(() => expect(focusedValue()).toBe("false"));
    const rendersAfterBlur = Number(readout().dataset.renders);
    for (let i = 0; i < 5; i++) {
      (i % 2 === 0 ? b : a).focus();
      await nextTask();
    }

    expect(rendersAfterBlur).toBeGreaterThan(rendersBefore);
    expect(Number(readout().dataset.renders)).toBe(rendersAfterBlur);
  });

  it("document changes do not re-render the consumer", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      skin: "raw",
      children: <Readout includeEditorUI />,
    });
    editor!.focus();
    await vi.waitFor(() => expect(focusedValue()).toBe("true"));

    const before = Number(readout().dataset.renders);
    editor!.insertInlineContent("some content that changes the document");
    await nextTask();

    expect(Number(readout().dataset.renders)).toBe(before);
  });
});

// Regression guards for the useEditorState-based implementation. Both went
// red on the refactor that introduced it and pin its two contracts:
// per-option event channels, and settled-only reads.
describe("useEditorFocus regressions", () => {
  it("raw focus follows focus moving into the editor's own UI", async ({
    setupEditor,
  }) => {
    // The raw ("focus") channel must fire on every content focus/blur — a
    // subscription to the settled combined channel misses this transition
    // entirely (combined state stays true), leaving the raw hook stale.
    const { editor, rootNode } = await setupEditor({
      skin: "raw",
      children: <Readout includeEditorUI={false} />,
    });
    editor!.focus();
    await vi.waitFor(() => expect(focusedValue()).toBe("true"));

    const uiInput = document.createElement("input");
    rootNode.querySelector(".bn-container")!.append(uiInput);
    uiInput.focus();
    expect(editor!.isFocused()).toBe(false);
    // A sibling input is editor UI even though the content itself lost focus.
    expect(editor!.isFocused({ includeEditorUI: true })).toBe(true);
    await vi.waitFor(() => expect(focusedValue()).toBe("false"));
  });

  it("a re-render during a focus handoff never shows a transient false", async ({
    setupEditor,
  }) => {
    let forceRender: () => void;
    function HandoffReadout() {
      const focused = useEditorFocus({ includeEditorUI: true });
      const [, bump] = useState(0);
      useEffect(() => {
        forceRender = () => flushSync(() => bump((n) => n + 1));
      }, []);
      const history = useRef<boolean[]>([]);
      history.current.push(focused);
      return (
        <div data-test="readout" data-history={history.current.join(",")} />
      );
    }
    const { editor } = await setupEditor({
      skin: "raw",
      children: <HandoffReadout />,
    });
    const history = () => readout().dataset.history!;

    editor!.focus();
    await vi.waitFor(() => {
      if (!history().endsWith("true")) {
        throw new Error("editor focus not settled");
      }
    });

    // The handoff: blur (activeElement passes through <body>), an unrelated
    // re-render mid-window, then the async-style focus restore the ariakit
    // and shadcn popovers perform. A live isFocused() read during that
    // render would see the transient and paint a one-frame false — the
    // stable module-level selectors only run at (settled) event time.
    (document.activeElement as HTMLElement).blur();
    forceRender!();
    editor!.focus();
    await nextTask();
    forceRender!();

    const entries = history().split(",");
    const afterSettled = entries.slice(entries.indexOf("true"));
    expect(afterSettled).not.toContain("false");
  });
});
