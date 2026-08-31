import { useCreateBlockNote, useEditorFocus } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useRef } from "react";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";

// `useEditorFocus` is the state counterpart to `useEditorFocusChange`. What
// needs proving is that it reports *settled* focus and doesn't re-render on
// every focus event in the page — the reasons it exists rather than each
// consumer wiring up useState + useEffect itself.

function Probe(props: { includeEditorUI: boolean }) {
  const editor = useCreateBlockNote();
  return (
    <BlockNoteView editor={editor}>
      <Readout includeEditorUI={props.includeEditorUI} />
    </BlockNoteView>
  );
}

function Readout(props: { includeEditorUI: boolean }) {
  const focused = useEditorFocus({ includeEditorUI: props.includeEditorUI });
  const renders = useRef(0);
  renders.current += 1;
  return (
    <div
      data-test="readout"
      data-focused={String(focused)}
      data-renders={String(renders.current)}
    />
  );
}

function readout() {
  return document.querySelector<HTMLElement>('[data-test="readout"]')!;
}

function focusedValue() {
  return readout().dataset.focused;
}

afterEach(() => {
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
    await render(<Probe includeEditorUI={false} />);
    await waitForSelector(EDITOR_SELECTOR);
    expect(focusedValue()).toBe("false");

    await focusOnEditor();
    await vi.waitFor(() => expect(focusedValue()).toBe("true"));

    addOutsideInput().focus();
    await vi.waitFor(() => expect(focusedValue()).toBe("false"));
  });

  test("with includeEditorUI, stays focused across a handoff into the editor's UI", async () => {
    await render(<Probe includeEditorUI={true} />);
    const editorElement = await waitForSelector(EDITOR_SELECTOR);
    await focusOnEditor();
    await vi.waitFor(() => expect(focusedValue()).toBe("true"));

    // A popover input, portalled outside the content area: the portal is the
    // container child that isn't an ancestor of the content element.
    const container = editorElement.closest(".bn-container")!;
    const portal = Array.from(container.children).find(
      (child) => !child.contains(editorElement),
    ) as HTMLElement;
    expect(portal).toBeDefined();
    const popoverInput = document.createElement("input");
    portal.append(popoverInput);
    popoverInput.focus();

    // Give the settle a chance to run, then confirm it never dropped.
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(focusedValue()).toBe("true");

    addOutsideInput().focus();
    await vi.waitFor(() => expect(focusedValue()).toBe("false"));
    popoverInput.remove();
  });

  test("does not re-render for focus changes elsewhere on the page", async () => {
    await render(<Probe includeEditorUI={true} />);
    await waitForSelector(EDITOR_SELECTOR);
    await focusOnEditor();
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

  test("typing does not re-render the consumer", async () => {
    await render(<Probe includeEditorUI={true} />);
    await waitForSelector(EDITOR_SELECTOR);
    await focusOnEditor();
    await vi.waitFor(() => expect(focusedValue()).toBe("true"));

    const before = Number(readout().dataset.renders);
    await userEvent.keyboard("some typing that changes the document");

    expect(Number(readout().dataset.renders)).toBe(before);
  });
});
