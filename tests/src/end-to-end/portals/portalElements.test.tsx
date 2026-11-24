import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  BlockNoteViewEditor,
  PortalElementOverride,
  usePortalElement,
} from "@blocknote/react";
import { describe, expect } from "vite-plus/test";
import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { userEvent } from "../../utils/context.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";
import { createPortalTarget } from "./portalTarget.js";

/**
 * A layout that renders the editor itself: a scrolling pane with the editor
 * next to a sidebar, both inside the `BlockNoteView`, as an app would.
 */
function ManualLayout() {
  return (
    <div style={{ display: "flex" }}>
      <div data-test="pane" style={{ flex: 1, height: 300, overflow: "auto" }}>
        <BlockNoteViewEditor />
      </div>
      <div data-test="sidebar" style={{ width: 200 }} />
    </div>
  );
}

async function openSlashMenu() {
  await focusOnEditor();
  await userEvent.keyboard("/");
  return waitForSelector("#bn-suggestion-menu");
}

describe("Portal elements", () => {
  it("uses the editor container as the default portal target", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor();
    const menu = await openSlashMenu();
    const container = document.querySelector<HTMLElement>(".bn-container");

    expect(container).not.toBeNull();
    expect(container?.contains(menu)).toBe(true);
    expect(menu.closest(".bn-root")).toBe(container);
    expect(editor.isWithinEditor(menu)).toBe(true);
  });

  it("creates a themed root in an external default portal target", async ({
    onTestFinished,
    setupEditor,
  }) => {
    const target = createPortalTarget(onTestFinished, "default-portal-target");
    const { editor } = await setupEditor({
      props: { portalElements: { default: target }, theme: "dark" },
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

  it("uses a per-element selector target instead of the default target", async ({
    onTestFinished,
    setupEditor,
  }) => {
    const defaultTarget = createPortalTarget(
      onTestFinished,
      "default-portal-target",
    );
    const slashTarget = createPortalTarget(
      onTestFinished,
      "slash-portal-target",
    );

    const { editor } = await setupEditor({
      props: {
        portalElements: {
          default: defaultTarget,
          slashMenu: "#slash-portal-target",
        },
        theme: "dark",
      },
    });
    const menu = await openSlashMenu();
    const root = menu.closest<HTMLElement>(".bn-root");

    expect(defaultTarget.contains(menu)).toBe(false);
    expect(slashTarget.contains(menu)).toBe(true);
    expect(root?.parentElement).toBe(slashTarget);
    expect(root?.getAttribute("data-mantine-color-scheme")).toBe("dark");
    expect(editor.isWithinEditor(menu)).toBe(true);
  });

  it("portals into document.body without registering the whole page", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      props: { portalElements: { slashMenu: document.body }, theme: "dark" },
    });
    const menu = await openSlashMenu();
    const root = menu.closest<HTMLElement>(".bn-root");

    expect(root?.parentElement).toBe(document.body);
    expect(root?.classList.contains("bn-mantine")).toBe(true);
    expect(root?.getAttribute("data-mantine-color-scheme")).toBe("dark");
    expect(editor.isWithinEditor(menu)).toBe(true);
    expect(editor.isWithinEditor(document.body)).toBe(false);
  });

  it("portals next to the editor when the layout renders it manually", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      props: { renderEditor: false },
      children: <ManualLayout />,
    });

    const menu = await openSlashMenu();
    const pane = document.querySelector<HTMLElement>("[data-test=pane]")!;

    // The menu lives in the editor's pane, so it clips and scrolls with the
    // editor instead of spilling over the sidebar next to it.
    expect(pane.contains(menu)).toBe(true);
    expect(editor.isWithinEditor(menu)).toBe(true);
  });

  // A parent's layout effect runs after its children's: a child that portals
  // into the override root and checks its DOM in its own layout effect must
  // not find it detached (Ariakit does that when choosing where to mount a
  // popover, and moves a detached element to `document.body`).
  it("has an override root in the document before its children's layout effects run", async ({
    onTestFinished,
    setupEditor,
  }) => {
    const target = createPortalTarget(onTestFinished, "portal-target");
    const seen: { connected: boolean; registered: boolean }[] = [];
    function Probe({
      editor,
    }: {
      editor: import("@blocknote/core").BlockNoteEditor;
    }) {
      const portalElement = usePortalElement();
      const ref = useRef<HTMLDivElement>(null);
      useLayoutEffect(() => {
        seen.push({
          connected: ref.current?.isConnected ?? false,
          registered: editor.isWithinEditor(ref.current!),
        });
      }, [editor]);
      if (!portalElement) {
        return null;
      }
      return createPortal(<div ref={ref} data-test="probe" />, portalElement);
    }

    await setupEditor({
      props: { renderEditor: false },
      children: ({ editor }) => (
        <>
          <BlockNoteViewEditor />
          <PortalElementOverride target={target}>
            <Probe editor={editor} />
          </PortalElementOverride>
        </>
      ),
    });
    await waitForSelector("[data-test=probe]");

    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]).toEqual({ connected: true, registered: true });
    expect(target.contains(document.querySelector("[data-test=probe]"))).toBe(
      true,
    );
  });

  // A view rendered inside another view's portalled UI, as the comments
  // composer is, must not inherit the outer view's portal element: that one
  // is registered with the outer editor only, so the nested editor's own menus
  // and popovers would count as outside it (see `PortalElementReset`).
  it("resolves its own container inside another view's portalled UI", async ({
    onTestFinished,
    setupEditor,
  }) => {
    const target = createPortalTarget(onTestFinished, "outer-portal-target");
    const { editor: inner } = await setupEditor({ mountType: "dom" });
    // The inner view must mount in the parent's React context for this test.
    inner.unmount();

    function Probe() {
      const portalElement = usePortalElement();
      if (!portalElement) {
        return null;
      }
      return createPortal(<div data-test="nested-probe" />, portalElement);
    }

    await setupEditor({
      props: { renderEditor: false },
      children: (
        <>
          <BlockNoteViewEditor />
          <PortalElementOverride target={target}>
            <BlockNoteView editor={inner}>
              <Probe />
            </BlockNoteView>
          </PortalElementOverride>
        </>
      ),
    });
    const probe = await waitForSelector("[data-test=nested-probe]");

    expect(inner.isWithinEditor(probe)).toBe(true);
    // Into the nested view's own container, not straight into the outer root.
    expect(probe.closest(".bn-container")?.contains(inner.domElement!)).toBe(
      true,
    );
  });
});
