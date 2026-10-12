import type { ViewMutationRecord } from "prosemirror-view";
import { describe, expect, it } from "vite-plus/test";

import {
  isFrameChromeEvent,
  isFrameRenderingMutation,
  type FrameView,
} from "./frame.js";

// A frame with chrome (a button) next to its slot, which holds the content.
function frameWithChrome() {
  const dom = document.createElement("section");
  const chrome = document.createElement("button");
  const slot = document.createElement("div");
  const content = document.createElement("p");
  slot.append(content);
  dom.append(chrome, slot);
  const frame: Pick<FrameView, "dom" | "slot"> = { dom, slot };
  return { frame, chrome, slot, content };
}

function eventOn(type: string, target: Node) {
  const event = new Event(type);
  Object.defineProperty(event, "target", { value: target });
  return event;
}

function mutation(record: Partial<ViewMutationRecord>) {
  return record as ViewMutationRecord;
}

describe("isFrameChromeEvent", () => {
  it("leaves events on the chrome to the frame", () => {
    const { frame, chrome } = frameWithChrome();
    expect(isFrameChromeEvent(frame, eventOn("mousedown", chrome))).toBe(true);
  });

  it("gives events in the slot to ProseMirror", () => {
    const { frame, content } = frameWithChrome();
    expect(isFrameChromeEvent(frame, eventOn("mousedown", content))).toBe(
      false,
    );
  });

  it("gives drag-and-drop events on the chrome to ProseMirror", () => {
    const { frame, chrome } = frameWithChrome();
    expect(isFrameChromeEvent(frame, eventOn("drop", chrome))).toBe(false);
  });

  it("gives clipboard events on the chrome to ProseMirror", () => {
    const { frame, chrome } = frameWithChrome();
    for (const type of ["copy", "cut", "paste"]) {
      expect(isFrameChromeEvent(frame, eventOn(type, chrome))).toBe(false);
    }
  });
});

describe("isFrameRenderingMutation", () => {
  it("ignores changes to the chrome", () => {
    const { frame, chrome } = frameWithChrome();
    expect(
      isFrameRenderingMutation(
        frame,
        mutation({ type: "childList", target: chrome }),
      ),
    ).toBe(true);
  });

  it("ignores attribute changes on the slot element itself", () => {
    const { frame, slot } = frameWithChrome();
    expect(
      isFrameRenderingMutation(
        frame,
        mutation({ type: "attributes", attributeName: "class", target: slot }),
      ),
    ).toBe(true);
  });

  it("reads changes inside the slot", () => {
    const { frame, content } = frameWithChrome();
    expect(
      isFrameRenderingMutation(
        frame,
        mutation({ type: "characterData", target: content }),
      ),
    ).toBe(false);
  });

  it("reads selection changes", () => {
    const { frame, chrome } = frameWithChrome();
    expect(
      isFrameRenderingMutation(
        frame,
        mutation({ type: "selection", target: chrome }),
      ),
    ).toBe(false);
  });

  it("ignores Dark Reader's rewrites inside the slot", () => {
    const { frame, content } = frameWithChrome();
    expect(
      isFrameRenderingMutation(
        frame,
        mutation({
          type: "attributes",
          attributeName: "data-darkreader-inline-color",
          target: content,
        }),
      ),
    ).toBe(true);
  });
});
