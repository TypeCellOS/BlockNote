import { afterEach, describe, expect, it } from "vite-plus/test";
import * as Y13 from "yjs";
import * as Y14 from "@y/y";
import { Awareness as Awareness13 } from "y-protocols/awareness";
import { Awareness as Awareness14 } from "@y/protocols/awareness";
import {
  absolutePositionToRelativePosition as relative13,
  ySyncPluginKey as sync13,
} from "y-prosemirror";
import {
  absolutePositionToRelativePosition as relative14,
  ySyncPluginKey as sync14,
} from "@y/prosemirror";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { withCollaboration as collaboration13 } from "../../yjs/extensions/index.js";
import { withCollaboration as collaboration14 } from "../../y/extensions/index.js";
import type { CollaborationUser } from "./cursor.js";
import "../../style.css";

type Options = {
  showCursorLabels?: "always" | "activity";
  renderCursor?: (user: CollaborationUser) => HTMLElement;
};
const remoteUser = { name: "Remote User", color: "#aaccff" };
const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    cleanup();
  }
});

function create13(options: Options) {
  const doc = new Y13.Doc();
  const awareness = new Awareness13(doc);
  const editor = BlockNoteEditor.create(
    collaboration13({
      collaboration: {
        ...options,
        fragment: doc.getXmlFragment("document"),
        provider: { awareness },
        user: { name: "Local", color: "#ff0000" },
      },
    }),
  );
  return {
    editor,
    move(position: number, name = remoteUser.name) {
      const state = sync13.getState(editor.prosemirrorState);
      if (!state) {
        throw new Error("Missing sync state");
      }
      const relative = relative13(position, state.type, state.binding.mapping);
      awareness.getStates().set(123, {
        user: { ...remoteUser, name },
        cursor: { anchor: relative, head: relative },
      });
      awareness.emit("change", [
        { added: [], updated: [123], removed: [] },
        "test",
      ]);
    },
    remove() {
      awareness.getStates().delete(123);
      awareness.emit("change", [
        { added: [], updated: [], removed: [123] },
        "test",
      ]);
    },
    destroy() {
      editor.unmount();
      awareness.destroy();
      doc.destroy();
    },
  };
}
function create14(options: Options) {
  const doc = new Y14.Doc();
  const awareness = new Awareness14(doc);
  const editor = BlockNoteEditor.create(
    collaboration14({
      collaboration: {
        ...options,
        fragment: doc.get("document"),
        provider: { awareness },
        user: { name: "Local", color: "#ff0000" },
      },
    }),
  );
  return {
    editor,
    move(position: number, name = remoteUser.name) {
      const state = sync14.getState(editor.prosemirrorState);
      if (!state) {
        throw new Error("Missing sync state");
      }
      const relative = relative14(
        editor.prosemirrorState.doc.resolve(position),
        state.ytype,
        state.renderer,
      );
      awareness.getStates().set(123, {
        user: { ...remoteUser, name },
        cursor: { anchor: relative, head: relative },
      });
      awareness.emit("change", [
        { added: [], updated: [123], removed: [] },
        "test",
      ]);
    },
    remove() {
      awareness.getStates().delete(123);
      awareness.emit("change", [
        { added: [], updated: [], removed: [123] },
        "test",
      ]);
    },
    destroy() {
      editor.unmount();
      awareness.destroy();
      doc.destroy();
    },
  };
}

for (const [name, create] of [
  ["Yjs 13", create13],
  ["Yjs 14", create14],
] as const) {
  describe(name + " collaboration labels", () => {
    function setup(
      options: Options = { showCursorLabels: "always" },
      portalTarget?: HTMLElement,
    ) {
      const container = document.createElement("div");
      container.style.cssText =
        "position:relative;width:500px;height:180px;overflow:auto;margin:40px;";
      const mount = document.createElement("div");
      container.append(mount);
      document.body.append(container);
      const session = create(options);
      session.editor.mount(mount, { portalTarget });
      session.editor.prosemirrorView.dom.style.cssText =
        "padding:0;min-height:400px;";
      session.editor.replaceBlocks(session.editor.document, [
        { type: "paragraph", content: "First line" },
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [{ cells: ["Table cell", "Other cell"] }],
          },
        },
        { type: "paragraph", content: "Last line" },
      ]);
      cleanups.push(() => {
        session.destroy();
        container.remove();
      });
      function moveTo(selector: string, atEnd = false, labelName?: string) {
        const element = mount.querySelector<HTMLElement>(selector);
        if (!element) {
          throw new Error("Missing cursor target: " + selector);
        }
        const position = session.editor.prosemirrorView.posAtDOM(
          element,
          atEnd ? element.childNodes.length : 0,
        );
        session.move(position, labelName);
      }
      async function label() {
        await expect
          .poll(
            () =>
              session.editor.portalElement.querySelector<HTMLElement>(
                ".bn-collaboration-cursor__label",
              )?.style.visibility,
          )
          .toBe("visible");
        return session.editor.portalElement.querySelector<HTMLElement>(
          ".bn-collaboration-cursor__label",
        )!;
      }
      return { ...session, container, mount, moveTo, label };
    }

    it("portals only the label and escapes the table boundary", async () => {
      const session = setup();
      const wrapper =
        session.mount.querySelector<HTMLElement>(".tableWrapper")!;
      wrapper.style.paddingTop = "0";
      session.moveTo("td p");
      const label = await session.label();
      const caret = session.mount.querySelector(
        "td .bn-collaboration-cursor__caret",
      );
      expect(caret).not.toBeNull();
      expect(session.mount.contains(label)).toBe(false);
      const table = session.mount.querySelector(".tableWrapper")!;
      expect(label.dataset.placement).toBe("top-start");
      expect(label.getBoundingClientRect().top).toBeLessThan(
        table.getBoundingClientRect().top,
      );
      session.remove();
      await expect
        .poll(() => session.editor.portalElement.childElementCount)
        .toBe(0);
    });

    it("flips below the editor top and keeps capped long labels inside the editor", async () => {
      const session = setup();
      session.moveTo(".bn-inline-content", false, "Remote User ".repeat(20));
      const label = await session.label();
      expect(label.dataset.placement).toBe("bottom-start");
      const editorRect = session.mount.getBoundingClientRect();
      expect(label.getBoundingClientRect().left).toBeGreaterThanOrEqual(
        editorRect.left - 1,
      );
      expect(label.getBoundingClientRect().right).toBeLessThanOrEqual(
        editorRect.right + 1,
      );
    });

    it("tracks scrolling and hides labels whose caret is clipped", async () => {
      const session = setup({ showCursorLabels: "always" }, document.body);
      session.moveTo("td p");
      const label = await session.label();
      const caret = session.mount.querySelector(
        ".bn-collaboration-cursor__caret",
      )!;
      session.container.scrollTop =
        caret.getBoundingClientRect().top -
        session.container.getBoundingClientRect().top -
        8;
      await expect.poll(() => label.dataset.placement).toBe("bottom-start");
      session.container.scrollTop = 140;
      await expect.poll(() => label.style.visibility).toBe("hidden");
      session.container.scrollTop = 0;
      await expect.poll(() => label.style.visibility).toBe("visible");
      session.editor.unmount();
      expect(label.isConnected).toBe(false);
    });

    it("flips left at the right edge and resizes labels with the editor", async () => {
      const session = setup();
      session.editor.updateBlock(session.editor.document.at(-1)!, {
        props: { textAlignment: "right" },
      });
      const paragraphs =
        session.mount.querySelectorAll<HTMLElement>(".bn-inline-content");
      const last = paragraphs[paragraphs.length - 1];
      session.move(
        session.editor.prosemirrorView.posAtDOM(last, last.childNodes.length),
      );
      const label = await session.label();
      expect(label.dataset.placement).toBe("top-end");
      session.container.style.width = "65px";
      await expect
        .poll(() => label.getBoundingClientRect().width)
        .toBeLessThanOrEqual(65);
      session.container.style.width = "500px";
      await expect
        .poll(() => label.getBoundingClientRect().width)
        .toBeGreaterThan(65);
    });

    it("tracks a table's scroll after a visible cursor moves into it", async () => {
      const session = setup();
      session.container.style.width = "180px";
      session.moveTo(".bn-inline-content");
      await session.label();
      session.moveTo("td p");
      await expect
        .poll(() =>
          session.mount.querySelector("td .bn-collaboration-cursor__caret"),
        )
        .not.toBeNull();
      const label = await session.label();
      const wrapper =
        session.mount.querySelector<HTMLElement>(".tableWrapper")!;
      wrapper.scrollLeft = wrapper.scrollWidth;
      await expect.poll(() => label.style.visibility).toBe("hidden");
      wrapper.scrollLeft = 0;
      await expect.poll(() => label.style.visibility).toBe("visible");
    });

    it("preserves custom cursor DOM and does not portal it", async () => {
      const custom = document.createElement("span");
      custom.textContent = "Custom cursor";
      const session = setup({
        showCursorLabels: "always",
        renderCursor: () => custom,
      });
      session.moveTo("td p");
      await expect.poll(() => session.mount.contains(custom)).toBe(true);
      expect(session.editor.portalElement.childElementCount).toBe(0);
    });

    it("shows activity labels on hover and removes them after inactivity", async () => {
      const session = setup({ showCursorLabels: "activity" });
      session.moveTo("td p");
      await session.label();
      await expect
        .poll(() => session.editor.portalElement.childElementCount, {
          timeout: 4000,
        })
        .toBe(0);
      const cursor = session.mount.querySelector(
        ".bn-collaboration-cursor__base",
      )!;
      cursor.dispatchEvent(new MouseEvent("mouseenter"));
      await session.label();
      cursor.dispatchEvent(new MouseEvent("mouseleave"));
      await expect
        .poll(() => session.editor.portalElement.childElementCount, {
          timeout: 4000,
        })
        .toBe(0);
    });
  });
}
