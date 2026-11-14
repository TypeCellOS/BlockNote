/**
 * Regression test for https://github.com/TypeCellOS/BlockNote/issues/3275
 *
 * `invokeAI` with the AI menu closed used to resolve on failure, because
 * `setAIResponseStatus` drops updates while `aiMenuState` is `"closed"`.
 */
import { BlockNoteEditor } from "@blocknote/core";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { AIExtension } from "./AIExtension.js";

const sendMessageWithAIRequest = vi.hoisted(() => vi.fn());

vi.mock("./api/index.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api/index.js")>();
  return {
    ...actual,
    sendMessageWithAIRequest,
  };
});

const mountedEditors: BlockNoteEditor[] = [];

function createEditor() {
  const editor = BlockNoteEditor.create({
    initialContent: [
      {
        id: "paragraph-1",
        type: "paragraph",
        content: "Hello",
      },
    ],
    extensions: [AIExtension()],
  });
  editor.mount(document.createElement("div"));
  mountedEditors.push(editor);
  return editor;
}

// jsdom does not implement scrolling. Opening the menu calls it on the block.
function withScrollIntoView(run: () => void) {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "scrollIntoView",
  );
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: () => {},
  });
  try {
    run();
  } finally {
    if (descriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        "scrollIntoView",
        descriptor,
      );
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
    }
  }
}

afterEach(() => {
  sendMessageWithAIRequest.mockReset();
  while (mountedEditors.length > 0) {
    mountedEditors.pop()?._tiptapEditor.destroy();
  }
});

describe("invokeAI errors when the AI menu is closed", () => {
  it("rejects with the chat error when the transport fails", async () => {
    const error = new Error("HTTP 500");
    sendMessageWithAIRequest.mockImplementation(async (chat: object) => {
      Object.defineProperty(chat, "status", {
        configurable: true,
        get: () => "error",
      });
      Object.defineProperty(chat, "error", {
        configurable: true,
        get: () => error,
      });
      return { ok: true, value: undefined };
    });
    const ai = createEditor().getExtension(AIExtension)!;

    await expect(ai.invokeAI({ userPrompt: "edit this" })).rejects.toBe(error);
    expect(ai.store.state.aiMenuState).toBe("closed");
  });

  it("rejects with a tool-execution error", async () => {
    const error = new Error("tool failed");
    sendMessageWithAIRequest.mockResolvedValue({ ok: false, error });
    const ai = createEditor().getExtension(AIExtension)!;

    await expect(ai.invokeAI({ userPrompt: "edit this" })).rejects.toBe(error);
    expect(ai.store.state.aiMenuState).toBe("closed");
  });

  it("rejects when the request throws", async () => {
    const error = new Error("network down");
    sendMessageWithAIRequest.mockRejectedValue(error);
    const ai = createEditor().getExtension(AIExtension)!;

    await expect(ai.invokeAI({ userPrompt: "edit this" })).rejects.toBe(error);
    expect(ai.store.state.aiMenuState).toBe("closed");
  });

  it("records a failed result in the menu instead of rejecting when the menu is open", async () => {
    const error = new Error("HTTP 500");
    sendMessageWithAIRequest.mockResolvedValue({ ok: false, error });
    const ai = createEditor().getExtension(AIExtension)!;
    withScrollIntoView(() => {
      ai.openAIMenuAtBlock("paragraph-1");
    });

    await expect(
      ai.invokeAI({ userPrompt: "edit this" }),
    ).resolves.toBeUndefined();
    expect(ai.store.state.aiMenuState).toEqual({
      status: "error",
      error,
      blockId: "paragraph-1",
    });
  });

  it("records a thrown failure in the menu instead of rejecting when the menu is open", async () => {
    const error = new Error("network down");
    sendMessageWithAIRequest.mockRejectedValue(error);
    const ai = createEditor().getExtension(AIExtension)!;
    withScrollIntoView(() => {
      ai.openAIMenuAtBlock("paragraph-1");
    });

    await expect(
      ai.invokeAI({ userPrompt: "edit this" }),
    ).resolves.toBeUndefined();
    expect(ai.store.state.aiMenuState).toEqual({
      status: "error",
      error,
      blockId: "paragraph-1",
    });
  });
});
