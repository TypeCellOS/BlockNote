/* eslint-disable react/globals -- Test components expose the mounted editor to assertions. */
import type { BlockNoteEditor } from "@blocknote/core";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vite-plus/test";

import { BlockNoteViewRaw } from "../../editor/BlockNoteView.js";
import { PortalElementAnchor } from "../../editor/PortalElementOverride.js";
import type { PortalElementsMap } from "../../editor/portalElements.js";
import { useCreateBlockNote } from "../../hooks/useCreateBlockNote.js";
import { FormattingToolbarController } from "./FormattingToolbarController.js";

// Only the device/keyboard signals are faked. Portal placement and focus use
// real DOM, including closed shadow roots; no skin or mobile harness is needed.
vi.mock("./useVirtualKeyboard.js", () => ({ useVirtualKeyboard: () => true }));
vi.mock("@blocknote/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@blocknote/core")>()),
  isTouchDevice: () => true,
}));

let editor: BlockNoteEditor;
let reactRoot: Root | undefined;
const elements: HTMLElement[] = [];

function appendElement(parent: HTMLElement | ShadowRoot = document.body) {
  const element = document.createElement("div");
  parent.append(element);
  elements.push(element);
  return element;
}

function Toolbar() {
  return <input data-test="toolbar-input" />;
}

function Probe(props: {
  portalElements?: PortalElementsMap;
  portalElement?: HTMLElement;
  theme?: "light" | "dark";
}) {
  editor = useCreateBlockNote();
  return (
    <BlockNoteViewRaw
      editor={editor}
      portalElements={props.portalElements}
      formattingToolbar={false}
      theme={props.theme ?? "dark"}
    >
      <PortalElementAnchor>
        <FormattingToolbarController
          formattingToolbar={Toolbar}
          portalElement={props.portalElement}
        />
      </PortalElementAnchor>
    </BlockNoteViewRaw>
  );
}

async function mount(
  parent: HTMLElement | ShadowRoot,
  props: Parameters<typeof Probe>[0] = {},
) {
  reactRoot = createRoot(appendElement(parent));
  reactRoot.render(<Probe {...props} />);
  await vi.waitFor(() => expect(editor?.domElement).toBeDefined());
  editor.focus();
}

async function toolbar(parent: HTMLElement | ShadowRoot) {
  return vi.waitFor(() => {
    const input = parent.querySelector<HTMLInputElement>(
      '[data-test="toolbar-input"]',
    );
    expect(input).not.toBeNull();
    return input!;
  });
}

afterEach(() => {
  reactRoot?.unmount();
  reactRoot = undefined;
  elements.splice(0).forEach((element) => element.remove());
});

test("escapes the editor container to body in light DOM", async () => {
  await mount(document.body);
  const input = await toolbar(document.body);
  const portalRoot = input.closest(".bn-root");
  expect(portalRoot?.parentNode).toBe(document.body);
  expect(editor.domElement?.parentElement?.contains(input)).toBe(false);
  expect(editor.isWithinEditor(input)).toBe(true);
  expect(portalRoot?.classList.contains("dark")).toBe(true);

  reactRoot!.unmount();
  reactRoot = undefined;
  expect(portalRoot?.isConnected).toBe(false);
  expect(editor.isWithinEditor(input)).toBe(false);
});

test.each(["open", "closed"] as const)(
  "uses the nearest %s shadow root and keeps toolbar input focus",
  async (mode) => {
    const outer = appendElement().attachShadow({ mode: "open" });
    const shadow = appendElement(outer).attachShadow({ mode });
    const outside = document.createElement("input");
    const style = document.createElement("style");
    style.textContent =
      '[data-test="toolbar-input"] { color: rgb(12, 34, 56); }';
    shadow.append(style, outside);

    await mount(shadow);
    const input = await toolbar(shadow);
    expect(input.closest(".bn-root")?.parentNode).toBe(shadow);
    expect(document.querySelector('[data-test="toolbar-input"]')).toBeNull();
    expect(getComputedStyle(input).color).toBe("rgb(12, 34, 56)");

    input.focus();
    await vi.waitFor(() =>
      expect(editor.isFocused({ includeEditorUI: true })).toBe(true),
    );
    expect(editor.isFocused()).toBe(false);
    // A fresh turn lets deferred blur settling run. The input must survive it.
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(input.isConnected).toBe(true);

    // Both elements share a shadow host: document receives neither event.
    outside.focus();
    await vi.waitFor(() => expect(input.isConnected).toBe(false));
    expect(editor.isFocused({ includeEditorUI: true })).toBe(false);
  },
);

test("inherits a view default through a local anchor", async () => {
  const target = appendElement();
  await mount(document.body, { portalElements: { default: target } });
  const input = await toolbar(target);
  expect(target.contains(input)).toBe(true);
  expect(
    input.closest(".bn-root")?.parentElement?.closest(".bn-root"),
  ).not.toBeNull();
});

test("a controller target beats the view default, including in shadow DOM", async () => {
  const shadow = appendElement().attachShadow({ mode: "open" });
  const defaultTarget = appendElement();
  const target = appendElement();
  await mount(shadow, {
    portalElements: { default: defaultTarget },
    portalElement: target,
  });
  const input = await toolbar(target);
  expect(input.closest(".bn-root")?.parentNode).toBe(target);
  expect(defaultTarget.contains(input)).toBe(false);
});

test("a nested editor resets the outer view's escape target", async () => {
  const target = appendElement();
  const shadow = appendElement().attachShadow({ mode: "open" });
  function NestedProbe() {
    const outerEditor = useCreateBlockNote();
    return (
      <BlockNoteViewRaw
        editor={outerEditor}
        portalElements={{ default: target }}
        formattingToolbar={false}
      >
        <Probe />
      </BlockNoteViewRaw>
    );
  }
  reactRoot = createRoot(appendElement(shadow));
  reactRoot.render(<NestedProbe />);
  await vi.waitFor(() => expect(editor.domElement?.isConnected).toBe(true));
  editor.focus();
  const input = await toolbar(shadow);
  expect(input.closest(".bn-root")?.parentNode).toBe(shadow);
  expect(target.contains(input)).toBe(false);
});

test("replacing the target moves and cleans up the registered root", async () => {
  const first = appendElement();
  const second = appendElement();
  await mount(document.body, { portalElement: first });
  const input = await toolbar(first);
  input.focus();

  reactRoot!.render(<Probe portalElement={second} />);
  await vi.waitFor(() => expect(first.childElementCount).toBe(0));
  // Moving a DOM subtree may blur it; restore editor focus to show the toolbar.
  editor.focus();
  const movedInput = await toolbar(second);
  expect(editor.isWithinEditor(movedInput)).toBe(true);
  movedInput.focus();
  expect(editor.isFocused({ includeEditorUI: true })).toBe(true);
});

test("changing theme preserves the portal and its focused input", async () => {
  await mount(document.body);
  const input = await toolbar(document.body);
  const portalRoot = input.closest(".bn-root")!;
  input.focus();
  const changes: MutationRecord[] = [];
  const observer = new MutationObserver((records) => changes.push(...records));
  observer.observe(portalRoot.parentNode!, { childList: true });
  try {
    reactRoot!.render(<Probe theme="light" />);
    await vi.waitFor(() =>
      expect(portalRoot.classList.contains("light")).toBe(true),
    );
    expect(await toolbar(document.body)).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(editor.isWithinEditor(input)).toBe(true);
    expect(
      changes.flatMap((change) => Array.from(change.removedNodes)),
    ).not.toContain(portalRoot);
  } finally {
    observer.disconnect();
  }
});
