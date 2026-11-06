import { NodeSelection } from "prosemirror-state";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createBlockSpec } from "../../schema/blocks/createSpec.js";

// A block that opts into the source popup, so the capture-phase keydown
// listener in SourceBlockWithPreview runs its text-key branch.
const previewBlock = createBlockSpec(
  {
    type: "previewBlock",
    propSchema: {},
    content: "plain",
  },
  {
    meta: { hasPreview: true },
    render: () => {
      const dom = document.createElement("div");
      return { dom, contentDOM: dom };
    },
  },
)();

const editors: BlockNoteEditor<any, any, any>[] = [];

afterEach(() => {
  for (const editor of editors) {
    editor._tiptapEditor.destroy();
  }
  editors.length = 0;
});

function mount(editor: BlockNoteEditor<any, any, any>) {
  editor.mount(document.createElement("div"));
  editors.push(editor);
  return editor;
}

// Safari autofill/dictation dispatches a trusted keydown whose `key` is
// undefined. `KeyboardEvent` itself never produces that value, so the test
// installs it the same way the bug report does.
function keydownWithoutKey(): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, "key", {
    configurable: true,
    get: () => undefined,
  });
  if (event.key !== undefined) {
    throw new Error("failed to simulate a keydown whose key is undefined");
  }
  return event;
}

// jsdom reports exceptions thrown from event listeners as window "error"
// events instead of letting them escape `dispatchEvent`. Collect those so a
// handler that reads `event.key.length` fails this test directly.
function pressKeyless(editor: BlockNoteEditor<any, any, any>) {
  const event = keydownWithoutKey();
  const errors: unknown[] = [];
  const onError = (errorEvent: ErrorEvent) => {
    errors.push(errorEvent.error);
    errorEvent.preventDefault();
  };
  window.addEventListener("error", onError);
  try {
    editor.prosemirrorView.dom.dispatchEvent(event);
  } finally {
    window.removeEventListener("error", onError);
  }
  return { event, errors };
}

describe("keydown events whose key is undefined", () => {
  it("does not throw from a text cursor (InlineContentBoundaryEdit)", () => {
    const editor = mount(
      BlockNoteEditor.create({
        initialContent: [{ id: "p", type: "paragraph", content: "hello" }],
      }),
    );
    editor.setTextCursorPosition("p", "end");
    const before = editor.document;

    const { event, errors } = pressKeyless(editor);

    expect(errors).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
    expect(editor.document).toEqual(before);
  });

  it("does not throw from a node selection (NodeSelectionKeyboard)", () => {
    const editor = mount(
      BlockNoteEditor.create({
        initialContent: [{ id: "img", type: "image" }],
      }),
    );
    editor.setTextCursorPosition("img");
    expect(editor.prosemirrorState.selection).toBeInstanceOf(NodeSelection);
    const before = editor.document;

    const { event, errors } = pressKeyless(editor);

    expect(errors).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
    expect(editor.document).toEqual(before);
  });

  it("does not throw on a closed source preview (SourceBlockWithPreview)", () => {
    const editor = mount(
      BlockNoteEditor.create({
        schema: BlockNoteSchema.create({
          blockSpecs: { ...defaultBlockSpecs, previewBlock },
        }),
        initialContent: [{ id: "src", type: "previewBlock", content: "x" }],
      }),
    );
    editor.setTextCursorPosition("src", "end");
    expect(editor.getTextCursorPosition().block.type).toBe("previewBlock");
    const before = editor.document;

    const { event, errors } = pressKeyless(editor);

    expect(errors).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
    expect(editor.document).toEqual(before);
  });
});
