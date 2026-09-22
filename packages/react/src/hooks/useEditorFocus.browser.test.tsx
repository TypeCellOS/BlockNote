import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot, Root } from "react-dom/client";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import type { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteViewRaw } from "../editor/BlockNoteView.js";
import { useCreateBlockNote } from "./useCreateBlockNote.js";
import { useEditorFocus } from "./useEditorFocus.js";

function appendToRegisteredPortalElement(
  editor: { registerPortalElement(element: HTMLElement): void },
  ...elements: HTMLElement[]
) {
  const root = document.createElement("div");
  document.body.append(root);
  editor.registerPortalElement(root);
  root.append(...elements);
  return root;
}

// `useEditorFocus` returns focus as state. What
// needs proving is that it reports *settled* focus and doesn't re-render on
// every focus event in the page — the reasons it exists rather than each
// consumer wiring up useState + useEffect itself. Focus semantics are real
// DOM behaviour, so this is a browser unit test rather than a jsdom one.

let root: Root | undefined;
let host: HTMLElement | undefined;
let editor: BlockNoteEditor<any, any, any> | undefined;

function Probe(props: { includeEditorUI: boolean }) {
  const probeEditor = useCreateBlockNote();
  editor = probeEditor;
  return (
    <BlockNoteViewRaw editor={probeEditor}>
      <Readout includeEditorUI={props.includeEditorUI} />
    </BlockNoteViewRaw>
  );
}

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

async function mount(element: React.ReactElement) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  root.render(element);
  await vi.waitFor(() => {
    if (!document.querySelector('[data-test="readout"]')) {
      throw new Error("probe never rendered");
    }
  });
}

function readout() {
  return document.querySelector<HTMLElement>('[data-test="readout"]')!;
}

function focusedValue() {
  return readout().dataset.focused;
}

afterEach(() => {
  root?.unmount();
  host?.remove();
  root = undefined;
  host = undefined;
  editor = undefined;
  document.querySelectorAll(".zz-outside").forEach((el) => el.remove());
});

function addOutsideInput() {
  const input = document.createElement("input");
  input.className = "zz-outside";
  document.body.append(input);
  return input;
}

describe("useEditorFocus", () => {
  test("reports content focus and blur", async () => {
    await mount(<Probe includeEditorUI={false} />);
    expect(focusedValue()).toBe("false");

    editor!.focus();
    await vi.waitFor(() => expect(focusedValue()).toBe("true"));

    addOutsideInput().focus();
    await vi.waitFor(() => expect(focusedValue()).toBe("false"));
  });

  test("with includeEditorUI, stays focused across a handoff into the editor's UI", async () => {
    await mount(<Probe includeEditorUI={true} />);
    editor!.focus();
    await vi.waitFor(() => expect(focusedValue()).toBe("true"));

    // A popover input, portalled outside the content area.
    const popoverInput = document.createElement("input");
    appendToRegisteredPortalElement(editor!, popoverInput);
    popoverInput.focus();

    // Give the settle a chance to run, then confirm it never dropped.
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(focusedValue()).toBe("true");

    addOutsideInput().focus();
    await vi.waitFor(() => expect(focusedValue()).toBe("false"));
    popoverInput.remove();
  });

  test("changing includeEditorUI re-reads instead of rendering a stale frame", async () => {
    // The cached snapshot is keyed by its inputs. Without that, flipping the
    // option while focus sits in the editor's UI renders one frame computed
    // for the *old* option (false) before the new subscription re-syncs —
    // the history would read "...,false,true" after the flip.
    function FlippableProbe() {
      const probeEditor = useCreateBlockNote();
      editor = probeEditor;
      const [includeEditorUI, setIncludeEditorUI] = useState(false);
      return (
        <BlockNoteViewRaw editor={probeEditor}>
          <Readout includeEditorUI={includeEditorUI} />
          <button data-test="flip" onClick={() => setIncludeEditorUI(true)}>
            flip
          </button>
        </BlockNoteViewRaw>
      );
    }
    await mount(<FlippableProbe />);

    // Focus the editor's UI: raw content focus reads false, UI focus true.
    const popoverInput = document.createElement("input");
    appendToRegisteredPortalElement(editor!, popoverInput);
    popoverInput.focus();
    await new Promise((resolve) => setTimeout(resolve, 60));
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

    popoverInput.remove();
  });

  test("does not re-render for focus changes elsewhere on the page", async () => {
    await mount(<Probe includeEditorUI={true} />);
    editor!.focus();
    await vi.waitFor(() => expect(focusedValue()).toBe("true"));

    const rendersBefore = Number(readout().dataset.renders);
    const a = addOutsideInput();
    const b = addOutsideInput();
    // Focus bouncing between two unrelated inputs: the editor goes unfocused
    // once, and must not re-render for every subsequent hop.
    a.focus();
    await vi.waitFor(() => expect(focusedValue()).toBe("false"));
    const rendersAfterBlur = Number(readout().dataset.renders);
    for (let i = 0; i < 5; i++) {
      (i % 2 === 0 ? b : a).focus();
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    expect(rendersAfterBlur).toBeGreaterThan(rendersBefore);
    expect(Number(readout().dataset.renders)).toBe(rendersAfterBlur);
  });

  test("document changes do not re-render the consumer", async () => {
    await mount(<Probe includeEditorUI={true} />);
    editor!.focus();
    await vi.waitFor(() => expect(focusedValue()).toBe("true"));

    const before = Number(readout().dataset.renders);
    editor!.insertInlineContent("some content that changes the document");
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(Number(readout().dataset.renders)).toBe(before);
  });
});

// Regression guards for the useEditorState-based implementation. Both went
// red on the refactor that introduced it and pin its two contracts:
// per-option event channels, and settled-only reads.
describe("useEditorFocus regressions", () => {
  test("raw focus follows focus moving into the editor's own UI", async () => {
    // The raw ("focus") channel must fire on every content focus/blur — a
    // subscription to the settled combined channel misses this transition
    // entirely (combined state stays true), leaving the raw hook stale.
    await mount(<Probe includeEditorUI={false} />);
    editor!.focus();
    await vi.waitFor(() => expect(focusedValue()).toBe("true"));

    const uiInput = document.createElement("input");
    document.querySelector(".bn-container")!.append(uiInput);
    uiInput.focus();
    expect(editor!.isFocused()).toBe(false);
    await vi.waitFor(() => expect(focusedValue()).toBe("false"));
  });

  test("a re-render during a focus handoff never shows a transient false", async () => {
    let forceRender: () => void;
    function HandoffReadout() {
      const focused = useEditorFocus({ includeEditorUI: true });
      const [, bump] = useState(0);
      forceRender = () => flushSync(() => bump((n) => n + 1));
      const history = useRef<boolean[]>([]);
      history.current.push(focused);
      return (
        <div data-test="readout" data-history={history.current.join(",")} />
      );
    }
    function HandoffProbe() {
      const probeEditor = useCreateBlockNote();
      editor = probeEditor;
      return (
        <BlockNoteViewRaw editor={probeEditor}>
          <HandoffReadout />
        </BlockNoteViewRaw>
      );
    }
    await mount(<HandoffProbe />);
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
    await new Promise((resolve) => setTimeout(resolve, 50));
    forceRender!();

    const entries = history().split(",");
    const afterSettled = entries.slice(entries.indexOf("true"));
    expect(afterSettled).not.toContain("false");
  });
});
