import { BlockNoteEditor } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  BlockNoteViewEditor,
  PortalElementsMap,
  useCreateBlockNote,
} from "@blocknote/react";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { useEffect } from "react";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";

function PortalTestEditor(props: {
  portalElements?: PortalElementsMap;
  theme?: "light" | "dark";
  onEditor: (editor: BlockNoteEditor) => void;
}) {
  const editor = useCreateBlockNote();

  useEffect(() => {
    props.onEditor(editor);
  }, [editor, props]);

  return (
    <BlockNoteView
      editor={editor}
      portalElements={props.portalElements}
      theme={props.theme}
    />
  );
}

/**
 * A layout that renders the editor itself: a scrolling pane with the editor
 * next to a sidebar, both inside the `BlockNoteView`, as an app would.
 */
function ManualLayoutEditor(props: {
  onEditor: (editor: BlockNoteEditor) => void;
}) {
  const editor = useCreateBlockNote();

  useEffect(() => {
    props.onEditor(editor);
  }, [editor, props]);

  return (
    <BlockNoteView editor={editor} renderEditor={false}>
      <div style={{ display: "flex" }}>
        <div
          data-test="pane"
          style={{ flex: 1, height: 300, overflow: "auto" }}
        >
          <BlockNoteViewEditor />
        </div>
        <div data-test="sidebar" style={{ width: 200 }} />
      </div>
    </BlockNoteView>
  );
}

function createPortalTarget(id: string, className?: string) {
  const target = document.createElement("div");
  target.id = id;
  target.dataset.testPortalTarget = "";
  target.className = className || "";
  document.body.append(target);
  return target;
}

async function renderEditor(props: {
  portalElements?: PortalElementsMap;
  theme?: "light" | "dark";
}) {
  let editor: BlockNoteEditor | undefined;

  await render(
    <PortalTestEditor
      {...props}
      onEditor={(value) => {
        editor = value;
      }}
    />,
  );
  await waitForSelector(".bn-editor");
  await vi.waitFor(() => {
    if (!editor) {
      throw new Error("Editor was not created");
    }
  });

  if (!editor) {
    throw new Error("Editor was not created");
  }

  return editor;
}

async function openSlashMenu() {
  await focusOnEditor();
  await userEvent.keyboard("/");
  return waitForSelector("#bn-suggestion-menu");
}

afterEach(() => {
  document
    .querySelectorAll<HTMLElement>("[data-test-portal-target]")
    .forEach((target) => target.remove());
});

describe("Portal elements", () => {
  test("uses the editor container as the default portal target", async () => {
    const editor = await renderEditor({});
    const menu = await openSlashMenu();
    const container = document.querySelector<HTMLElement>(".bn-container");

    expect(container).not.toBeNull();
    expect(container?.contains(menu)).toBe(true);
    expect(menu.closest(".bn-root")).toBe(container);
    expect(editor.isWithinEditor(menu)).toBe(true);
  });

  test("creates a themed root in an external default portal target", async () => {
    const target = createPortalTarget("default-portal-target");
    const editor = await renderEditor({
      portalElements: { default: target },
      theme: "dark",
    });
    const menu = await openSlashMenu();
    const root = menu.closest<HTMLElement>(".bn-root");

    expect(target.contains(menu)).toBe(true);
    expect(root?.parentElement).toBe(target);
    expect(root?.classList.contains("bn-mantine")).toBe(true);
    expect(root?.classList.contains("dark")).toBe(true);
    expect(root?.getAttribute("data-mantine-color-scheme")).toBe("dark");
    expect(editor.isWithinEditor(menu)).toBe(true);
  });

  test("uses a per-element selector target instead of the default target", async () => {
    const defaultTarget = createPortalTarget("default-portal-target");
    const slashTarget = createPortalTarget("slash-portal-target");

    const editor = await renderEditor({
      portalElements: {
        default: defaultTarget,
        slashMenu: "#slash-portal-target",
      },
      theme: "dark",
    });
    const menu = await openSlashMenu();
    const root = menu.closest<HTMLElement>(".bn-root");

    expect(defaultTarget.contains(menu)).toBe(false);
    expect(slashTarget.contains(menu)).toBe(true);
    expect(root?.parentElement).toBe(slashTarget);
    expect(root?.getAttribute("data-mantine-color-scheme")).toBe("dark");
    expect(editor.isWithinEditor(menu)).toBe(true);
  });

  test("portals into document.body without registering the whole page", async () => {
    const editor = await renderEditor({
      portalElements: { slashMenu: document.body },
      theme: "dark",
    });
    const menu = await openSlashMenu();
    const root = menu.closest<HTMLElement>(".bn-root");

    expect(root?.parentElement).toBe(document.body);
    expect(root?.classList.contains("bn-mantine")).toBe(true);
    expect(root?.getAttribute("data-mantine-color-scheme")).toBe("dark");
    expect(editor.isWithinEditor(menu)).toBe(true);
    expect(editor.isWithinEditor(document.body)).toBe(false);
  });

  test("portals next to the editor when the layout renders it manually", async () => {
    let editor: BlockNoteEditor | undefined;
    await render(
      <ManualLayoutEditor
        onEditor={(value) => {
          editor = value;
        }}
      />,
    );
    await waitForSelector(".bn-editor");
    await vi.waitFor(() => {
      if (!editor) {
        throw new Error("Editor was not created");
      }
    });
    if (!editor) {
      throw new Error("Editor was not created");
    }

    const menu = await openSlashMenu();
    const pane = document.querySelector<HTMLElement>("[data-test=pane]")!;

    // The menu lives in the editor's pane, so it clips and scrolls with the
    // editor instead of spilling over the sidebar next to it.
    expect(pane.contains(menu)).toBe(true);
    expect(editor.isWithinEditor(menu)).toBe(true);
  });
});
