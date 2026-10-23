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

function expectLabelTransition(
  label: HTMLElement,
  caret: Element,
  from: DOMRect,
  to: DOMRect,
) {
  const animations = label.getAnimations();
  expect(animations.length).toBeGreaterThan(0);
  for (const animation of animations) {
    animation.pause();
    animation.currentTime = 0;
  }
  const start = label.getBoundingClientRect();
  for (const property of ["top", "left", "width", "height"] as const) {
    expect(start[property]).toBeCloseTo(from[property], 1);
  }
  for (const animation of animations) {
    animation.currentTime = 100;
  }
  const middle = label.getBoundingClientRect();
  for (const property of ["top", "left", "width", "height"] as const) {
    if (Math.abs(from[property] - to[property]) > 1) {
      expect(middle[property]).toBeGreaterThan(
        Math.min(from[property], to[property]),
      );
      expect(middle[property]).toBeLessThan(
        Math.max(from[property], to[property]),
      );
    }
  }
  // Moving the anchor must move the whole in-progress animation immediately,
  // rather than starting another transition from its old viewport coordinates.
  const caretStyle = caret.getAttribute("style");
  const dx =
    caret.getBoundingClientRect().right >
    document.documentElement.clientWidth - 20
      ? -10
      : 10;
  caret.setAttribute("style", `${caretStyle ?? ""};translate:${dx}px 1px;`);
  const moved = label.getBoundingClientRect();
  expect(moved.left - middle.left).toBeCloseTo(dx, 1);
  expect(moved.top - middle.top).toBeCloseTo(1, 1);
  if (caretStyle === null) {
    caret.removeAttribute("style");
  } else {
    caret.setAttribute("style", caretStyle);
  }

  // Sampling just before completion catches a delayed placement reset that
  // would otherwise snap to the endpoint when the animation finishes.
  for (const animation of animations) {
    animation.currentTime = 199;
  }
  const almostFinished = label.getBoundingClientRect();
  for (const property of ["top", "left", "width", "height"] as const) {
    expect(Math.abs(almostFinished[property] - to[property])).toBeLessThan(1);
  }
  for (const animation of animations) {
    animation.finish();
  }
  const finished = label.getBoundingClientRect();
  for (const property of ["top", "left", "width", "height"] as const) {
    expect(finished[property]).toBeCloseTo(to[property], 1);
  }
}

function expectOpeningAndClosing(label: HTMLElement, caret: Element) {
  const open = label.getBoundingClientRect();
  const anchor = caret.getBoundingClientRect();
  const closed = new DOMRect(anchor.left, anchor.top - 2, 4, 5);
  label.removeAttribute("data-active");
  expectLabelTransition(label, caret, open, closed);
  label.setAttribute("data-active", "");
  expectLabelTransition(label, caret, closed, open);
}

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
    clearCursor() {
      awareness.getStates().set(123, { user: remoteUser, cursor: null });
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
    clearCursor() {
      awareness.getStates().set(123, { user: remoteUser, cursor: null });
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
      function moveTo(selector: string, labelName?: string) {
        const element = mount.querySelector<HTMLElement>(selector);
        if (!element) {
          throw new Error("Missing cursor target: " + selector);
        }
        const position = session.editor.prosemirrorView.posAtDOM(element, 0);
        session.move(position, labelName);
      }
      async function label() {
        await expect
          .poll(() =>
            session.editor.portalElement.querySelector<HTMLElement>(
              ".bn-collaboration-cursor__label",
            ),
          )
          .not.toBeNull();
        const element = session.editor.portalElement.querySelector<HTMLElement>(
          ".bn-collaboration-cursor__label",
        )!;
        await expect
          .poll(() =>
            getComputedStyle(element)
              .getPropertyValue("--bn-cursor-label-open")
              .trim(),
          )
          .toBe("1");
        return element;
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
      await expect
        .poll(() => getComputedStyle(label).borderBottomLeftRadius)
        .toBe("0px");
      expect(getComputedStyle(label).borderTopLeftRadius).toBe("3px");
      expect(getComputedStyle(label).borderTopRightRadius).toBe("3px");
      expect(getComputedStyle(label).borderBottomRightRadius).toBe("3px");
      expect(label.getBoundingClientRect().bottom).toBeCloseTo(
        caret!.getBoundingClientRect().top,
        0,
      );
      expect(label.getBoundingClientRect().top).toBeLessThan(
        wrapper.getBoundingClientRect().top,
      );
      expectOpeningAndClosing(label, caret!);
      session.remove();
      await expect
        .poll(() => session.editor.portalElement.childElementCount)
        .toBe(0);
    });

    it("uses distinct anchors for the same collaborator in multiple editors", async () => {
      const first = setup({ showCursorLabels: "always" }, document.body);
      const second = setup({ showCursorLabels: "always" }, document.body);
      first.moveTo(".bn-inline-content");
      second.moveTo("td p");
      const firstLabel = await first.label();
      const secondLabel = await second.label();
      expect(firstLabel.style.getPropertyValue("position-anchor")).not.toBe(
        secondLabel.style.getPropertyValue("position-anchor"),
      );
      for (const [session, label] of [
        [first, firstLabel],
        [second, secondLabel],
      ] as const) {
        const caret = session.mount.querySelector<HTMLElement>(
          ".bn-collaboration-cursor__caret",
        )!;
        expect(label.style.getPropertyValue("position-anchor")).toBe(
          caret.style.getPropertyValue("anchor-name"),
        );
        expect(label.getBoundingClientRect().bottom).toBeCloseTo(
          caret.getBoundingClientRect().top,
          0,
        );
      }
    });

    it("keeps labels above the caret at the editor top edge", async () => {
      const session = setup();
      session.moveTo(".bn-inline-content", "Remote User ".repeat(20));
      const label = await session.label();
      const caret = session.mount.querySelector(
        ".bn-collaboration-cursor__caret",
      )!;
      expect(label.getBoundingClientRect().bottom).toBeCloseTo(
        caret.getBoundingClientRect().top,
        0,
      );
      expect(label.getBoundingClientRect().left).toBeCloseTo(
        caret.getBoundingClientRect().left,
        0,
      );
      expect(label.getBoundingClientRect().top).toBeLessThan(
        session.mount.getBoundingClientRect().top,
      );
    });

    for (const edge of ["top", "right", "top-right"] as const) {
      it(`keeps labels inside the viewport at the ${edge} edge`, async () => {
        const session = setup();
        const atTop = edge !== "right";
        const atRight = edge !== "top";
        session.container.style.cssText = `position:fixed;top:${atTop ? 0 : 80}px;left:${atRight ? "auto" : "40px"};right:${atRight ? "4px" : "auto"};width:500px;height:180px;overflow:auto;margin:0;`;
        if (atRight) {
          session.editor.updateBlock(session.editor.document[0], {
            props: { textAlignment: "right" },
          });
        }
        const paragraph =
          session.mount.querySelector<HTMLElement>(".bn-inline-content")!;
        session.move(
          session.editor.prosemirrorView.posAtDOM(
            paragraph,
            atRight ? paragraph.childNodes.length : 0,
          ),
        );
        const label = await session.label();
        const caret = session.mount.querySelector<HTMLElement>(
          ".bn-collaboration-cursor__caret",
        )!;
        await expect
          .poll(() => {
            const rect = label.getBoundingClientRect();
            return (
              rect.top >= 0 &&
              rect.left >= 0 &&
              rect.right <= document.documentElement.clientWidth &&
              rect.bottom <= document.documentElement.clientHeight
            );
          })
          .toBe(true);
        await expect
          .poll(() => {
            const style = getComputedStyle(label);
            return [
              style.borderTopLeftRadius,
              style.borderTopRightRadius,
              style.borderBottomRightRadius,
              style.borderBottomLeftRadius,
            ];
          })
          .toEqual(
            edge === "top"
              ? ["0px", "3px", "3px", "3px"]
              : edge === "right"
                ? ["3px", "3px", "0px", "3px"]
                : ["3px", "0px", "3px", "3px"],
          );
        if (atTop) {
          expect(label.getBoundingClientRect().top).toBeCloseTo(
            caret.getBoundingClientRect().bottom,
            0,
          );
        } else {
          expect(label.getBoundingClientRect().bottom).toBeCloseTo(
            caret.getBoundingClientRect().top,
            0,
          );
        }
        if (atRight) {
          expect(label.getBoundingClientRect().right).toBeCloseTo(
            caret.getBoundingClientRect().right,
            0,
          );
        }
        expectOpeningAndClosing(label, caret!);
      });
    }

    it("tracks scrolling without hiding labels whose caret is clipped", async () => {
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
      await expect
        .poll(() =>
          Math.abs(
            label.getBoundingClientRect().bottom -
              caret.getBoundingClientRect().top,
          ),
        )
        .toBeLessThan(1);
      session.container.scrollTop += 16;
      await expect
        .poll(() =>
          Math.abs(
            label.getBoundingClientRect().bottom -
              caret.getBoundingClientRect().top,
          ),
        )
        .toBeLessThan(1);
      expect(getComputedStyle(label).visibility).toBe("visible");
      session.container.scrollTop = 0;
      await expect
        .poll(() =>
          Math.abs(
            label.getBoundingClientRect().bottom -
              caret.getBoundingClientRect().top,
          ),
        )
        .toBeLessThan(1);
      session.editor.unmount();
      expect(label.isConnected).toBe(false);
    });

    it("keeps labels to the right of the caret at the editor right edge", async () => {
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
      const caret = session.mount.querySelector(
        ".bn-collaboration-cursor__caret",
      )!;
      expect(label.getBoundingClientRect().left).toBeCloseTo(
        caret.getBoundingClientRect().left,
        0,
      );
      expect(label.getBoundingClientRect().right).toBeGreaterThan(
        session.mount.getBoundingClientRect().right,
      );
    });

    it("follows layout changes without an editor transaction", async () => {
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
      const caret = session.mount.querySelector(
        ".bn-collaboration-cursor__caret",
      )!;
      const originalLeft = label.getBoundingClientRect().left;
      session.container.style.width = "300px";
      await expect
        .poll(() => label.getBoundingClientRect().left)
        .toBeLessThan(originalLeft);
      expect(label.getBoundingClientRect().left).toBeCloseTo(
        caret.getBoundingClientRect().left,
        0,
      );
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
      const caret = session.mount.querySelector(
        "td .bn-collaboration-cursor__caret",
      )!;
      wrapper.scrollLeft = wrapper.scrollWidth;
      await expect
        .poll(() =>
          Math.abs(
            label.getBoundingClientRect().left -
              caret.getBoundingClientRect().left,
          ),
        )
        .toBeLessThan(1);
      expect(getComputedStyle(label).visibility).toBe("visible");
      wrapper.scrollLeft = 0;
      await expect
        .poll(() =>
          Math.abs(
            label.getBoundingClientRect().left -
              caret.getBoundingClientRect().left,
          ),
        )
        .toBeLessThan(1);
    });

    for (const showCursorLabels of ["always", "activity"] as const) {
      it(`cleans up a cleared cursor and renders its return (${showCursorLabels})`, async () => {
        const session = setup({ showCursorLabels });
        session.moveTo("td p");
        const original = await session.label();
        session.clearCursor();
        expect(original.isConnected).toBe(false);
        expect(session.editor.portalElement.childElementCount).toBe(0);
        session.moveTo(".bn-inline-content");
        const returned = await session.label();
        expect(returned).not.toBe(original);
        expect(session.editor.portalElement.childElementCount).toBe(1);
        session.remove();
        expect(session.editor.portalElement.childElementCount).toBe(0);
      });
    }

    it("reuses the label when rebuilding a cursor and updates its user", async () => {
      const session = setup();
      session.moveTo(".bn-inline-content");
      const original = await session.label();
      session.moveTo("td p", "Updated User");
      const updated = await session.label();
      expect(updated).toBe(original);
      expect(updated.textContent).toBe("Updated User");
      expect(session.editor.portalElement.childElementCount).toBe(1);
      session.editor.unmount();
      expect(session.editor.portalElement.childElementCount).toBe(0);
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

    it("opens at the new caret location when a hidden cursor moves", async () => {
      const session = setup({ showCursorLabels: "activity" });
      session.moveTo(".bn-inline-content");
      const label = await session.label();
      label.removeAttribute("data-active");
      for (const animation of label.getAnimations()) {
        animation.finish();
      }
      const oldPosition = label.getBoundingClientRect();
      session.moveTo("td p");
      const animations = label.getAnimations();
      for (const animation of animations) {
        animation.pause();
        animation.currentTime = 0;
      }
      const caret = session.mount.querySelector<HTMLElement>(
        "td .bn-collaboration-cursor__caret",
      )!;
      const start = label.getBoundingClientRect();
      expect(start.top).not.toBeCloseTo(oldPosition.top, 1);
      expect(start.top).toBeCloseTo(caret.getBoundingClientRect().top - 2, 1);
      expect(start.left).toBeCloseTo(caret.getBoundingClientRect().left, 1);
      for (const animation of animations) {
        animation.finish();
      }
    });

    it("shows activity labels on hover and hides them after inactivity", async () => {
      const session = setup({ showCursorLabels: "activity" });
      session.moveTo("td p");
      const label = await session.label();
      await expect
        .poll(
          () =>
            getComputedStyle(label)
              .getPropertyValue("--bn-cursor-label-open")
              .trim(),
          { timeout: 4000 },
        )
        .toBe("0");
      expect(label.isConnected).toBe(true);
      const cursor = session.mount.querySelector(
        ".bn-collaboration-cursor__base",
      )!;
      cursor.dispatchEvent(new MouseEvent("mouseenter"));
      await expect
        .poll(() =>
          getComputedStyle(label)
            .getPropertyValue("--bn-cursor-label-open")
            .trim(),
        )
        .toBe("1");
      cursor.dispatchEvent(new MouseEvent("mouseleave"));
      await expect
        .poll(
          () =>
            getComputedStyle(label)
              .getPropertyValue("--bn-cursor-label-open")
              .trim(),
          { timeout: 4000 },
        )
        .toBe("0");
    });
  });
}
