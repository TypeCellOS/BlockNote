import type { BlockNoteEditor } from "@blocknote/core";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, vi } from "vite-plus/test";
import { installBrowserNoMotion } from "../../../../../tests/src/commands/browser/installBrowserTestStyles.js";
import type { SetupEditor } from "../../../../../tests/src/commands/browser/setupEditor.js";
import { acquireTiptapFixtureStyles } from "../../../../../tests/src/commands/browser/tiptapFixtureStyles.js";

import { BlockNoteViewRaw } from "../../editor/BlockNoteView.js";
import { PortalElementAnchor } from "../../editor/PortalElementOverride.js";
import type { PortalElementsMap } from "../../editor/portalElements.js";
import { FormattingToolbarController } from "./FormattingToolbarController.js";
import { FormattingToolbarInputContext } from "./FormattingToolbarInputContext.js";

const openTouchKeyboard = { isTouchDevice: true, keyboardOpen: true };
const noPopoverMotion = {
  useTransitionStatusProps: { duration: 0 },
  useTransitionStylesProps: { duration: 0 },
};

let editor: BlockNoteEditor;
let reactRoot: Root | undefined;
let reactHost: HTMLElement | undefined;
let styles: ReturnType<typeof acquireTiptapFixtureStyles> | undefined;
const elements: HTMLElement[] = [];

function appendElement(parent: HTMLElement | ShadowRoot = document.body) {
  const element = document.createElement("div");
  parent.append(element);
  elements.push(element);
  return element;
}

function createEditorRoot(parent: HTMLElement | ShadowRoot = document.body) {
  const host = document.createElement("div");
  parent.append(host);
  reactHost = host;
  styles = acquireTiptapFixtureStyles(host.ownerDocument);
  reactRoot = createRoot(host);
}

function renderEditorRoot(children: React.ReactNode) {
  styles!.track(() => flushSync(() => reactRoot!.render(children)));
}

function unmountEditorRoot() {
  try {
    styles?.dispose(() => {
      try {
        reactRoot?.unmount();
      } finally {
        reactHost?.remove();
      }
    });
  } finally {
    reactHost = undefined;
    reactRoot = undefined;
    styles = undefined;
  }
}

function Toolbar() {
  return <input data-test="toolbar-input" />;
}

function Probe(props: {
  editor: BlockNoteEditor;
  portalElements?: PortalElementsMap;
  portalElement?: HTMLElement;
  theme?: "light" | "dark";
}) {
  return (
    <BlockNoteViewRaw
      editor={props.editor}
      portalElements={props.portalElements}
      formattingToolbar={false}
      theme={props.theme ?? "dark"}
    >
      <PortalElementAnchor>
        <FormattingToolbarController
          formattingToolbar={Toolbar}
          floatingUIOptions={noPopoverMotion}
          portalElement={props.portalElement}
        />
      </PortalElementAnchor>
    </BlockNoteViewRaw>
  );
}

function MobileProbe(props: Parameters<typeof Probe>[0]) {
  return (
    <FormattingToolbarInputContext.Provider value={openTouchKeyboard}>
      <Probe {...props} />
    </FormattingToolbarInputContext.Provider>
  );
}

async function mount(
  setupEditor: SetupEditor,
  parent: HTMLElement | ShadowRoot,
  props: Omit<Parameters<typeof Probe>[0], "editor"> = {},
) {
  ({ editor } = await setupEditor({ mountType: false }));
  createEditorRoot(parent);
  renderEditorRoot(<MobileProbe editor={editor} {...props} />);
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
  try {
    unmountEditorRoot();
  } finally {
    elements.splice(0).forEach((element) => element.remove());
  }
});

it("escapes the editor container to body in light DOM", async ({
  setupEditor,
}) => {
  await mount(setupEditor, document.body);
  const input = await toolbar(document.body);
  const portalRoot = input.closest(".bn-root");
  expect(portalRoot?.parentNode).toBe(document.body);
  expect(editor.domElement?.parentElement?.contains(input)).toBe(false);
  expect(editor.isWithinEditor(input)).toBe(true);
  expect(portalRoot?.classList.contains("dark")).toBe(true);

  unmountEditorRoot();
  expect(portalRoot?.isConnected).toBe(false);
  expect(editor.isWithinEditor(input)).toBe(false);
});

it.for(["open", "closed"] as const)(
  "uses the nearest %s shadow root and keeps toolbar input focus",
  async (mode, { setupEditor, onTestFinished }) => {
    const outer = appendElement().attachShadow({ mode: "open" });
    onTestFinished(installBrowserNoMotion(outer));
    const shadow = appendElement(outer).attachShadow({ mode });
    onTestFinished(installBrowserNoMotion(shadow));
    const outside = document.createElement("input");
    const style = document.createElement("style");
    style.textContent =
      '[data-test="toolbar-input"] { color: rgb(12, 34, 56); }';
    shadow.append(style, outside);

    await mount(setupEditor, shadow);
    const input = await toolbar(shadow);
    expect(input.closest(".bn-root")?.parentNode).toBe(shadow);
    expect(document.querySelector('[data-test="toolbar-input"]')).toBeNull();
    expect(getComputedStyle(input).color).toBe("rgb(12, 34, 56)");

    input.focus();
    expect(shadow.activeElement).toBe(input);
    expect(editor.isFocused({ includeEditorUI: true })).toBe(true);
    expect(editor.isFocused()).toBe(false);
    // The focus tracker settles blur in a timer queued during focus().
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(input.isConnected).toBe(true);

    // Both elements share a shadow host: document receives neither event.
    outside.focus();
    await vi.waitFor(() => expect(input.isConnected).toBe(false));
    expect(editor.isFocused({ includeEditorUI: true })).toBe(false);
  },
);

it("inherits a view default through a local anchor", async ({
  setupEditor,
}) => {
  const target = appendElement();
  await mount(setupEditor, document.body, {
    portalElements: { default: target },
  });
  const input = await toolbar(target);
  expect(target.contains(input)).toBe(true);
  expect(
    input.closest(".bn-root")?.parentElement?.closest(".bn-root"),
  ).not.toBeNull();
});

it("a controller target beats the view default, including in shadow DOM", async ({
  setupEditor,
  onTestFinished,
}) => {
  const shadow = appendElement().attachShadow({ mode: "open" });
  onTestFinished(installBrowserNoMotion(shadow));
  const defaultTarget = appendElement();
  const target = appendElement();
  await mount(setupEditor, shadow, {
    portalElements: { default: defaultTarget },
    portalElement: target,
  });
  const input = await toolbar(target);
  expect(input.closest(".bn-root")?.parentNode).toBe(target);
  expect(defaultTarget.contains(input)).toBe(false);
});

it("a nested editor resets the outer view's escape target", async ({
  setupEditor,
  onTestFinished,
}) => {
  const target = appendElement();
  const shadow = appendElement().attachShadow({ mode: "open" });
  onTestFinished(installBrowserNoMotion(shadow));
  const { editor: outerEditor } = await setupEditor({ mountType: false });
  ({ editor } = await setupEditor({ mountType: false }));
  createEditorRoot(shadow);
  renderEditorRoot(
    <BlockNoteViewRaw
      editor={outerEditor}
      portalElements={{ default: target }}
      formattingToolbar={false}
    >
      <MobileProbe editor={editor} />
    </BlockNoteViewRaw>,
  );
  await vi.waitFor(() => expect(editor.domElement?.isConnected).toBe(true));
  editor.focus();
  const input = await toolbar(shadow);
  expect(input.closest(".bn-root")?.parentNode).toBe(shadow);
  expect(target.contains(input)).toBe(false);
});

it("replacing the target moves and cleans up the registered root", async ({
  setupEditor,
}) => {
  const first = appendElement();
  const second = appendElement();
  await mount(setupEditor, document.body, { portalElement: first });
  const input = await toolbar(first);
  input.focus();

  renderEditorRoot(<MobileProbe editor={editor} portalElement={second} />);
  await vi.waitFor(() => expect(first.childElementCount).toBe(0));
  // Moving a DOM subtree may blur it; restore editor focus to show the toolbar.
  editor.focus();
  const movedInput = await toolbar(second);
  expect(editor.isWithinEditor(movedInput)).toBe(true);
  movedInput.focus();
  expect(editor.isFocused({ includeEditorUI: true })).toBe(true);
});

it("changing theme preserves the portal and its focused input", async ({
  setupEditor,
}) => {
  await mount(setupEditor, document.body);
  const input = await toolbar(document.body);
  const portalRoot = input.closest(".bn-root")!;
  input.focus();
  const changes: MutationRecord[] = [];
  const observer = new MutationObserver((records) => changes.push(...records));
  observer.observe(portalRoot.parentNode!, { childList: true });
  try {
    renderEditorRoot(<MobileProbe editor={editor} theme="light" />);
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

it("keeps an ordinary editor on the desktop path beside an open touch keyboard", async ({
  setupEditor,
  selectText,
}) => {
  const mobileTarget = appendElement();
  const desktopTarget = appendElement();
  const { editor: desktopEditor } = await setupEditor({
    mountType: false,
    initialContent: [{ type: "paragraph", content: "Selected text" }],
  });
  ({ editor } = await setupEditor({ mountType: false }));
  createEditorRoot();
  renderEditorRoot(
    <>
      <MobileProbe editor={editor} portalElement={mobileTarget} />
      <Probe editor={desktopEditor} portalElement={desktopTarget} />
    </>,
  );
  await vi.waitFor(() => {
    expect(editor.domElement?.isConnected).toBe(true);
    expect(desktopEditor.domElement?.isConnected).toBe(true);
  });

  desktopEditor.focus();
  selectText(desktopEditor, "Selected text");
  const desktopInput = await toolbar(desktopTarget);
  expect(desktopInput.closest(".bn-mobile-formatting-toolbar")).toBeNull();
  expect(mobileTarget.querySelector('[data-test="toolbar-input"]')).toBeNull();

  editor.focus();
  const mobileInput = await toolbar(mobileTarget);
  expect(mobileInput.closest(".bn-mobile-formatting-toolbar")).not.toBeNull();
  expect(editor.isWithinEditor(mobileInput)).toBe(true);
  await vi.waitFor(() => expect(desktopInput.isConnected).toBe(false));
});
