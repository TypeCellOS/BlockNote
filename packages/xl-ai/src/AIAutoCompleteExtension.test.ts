import { BlockNoteEditor, InlineContent, isStyledTextInlineContent } from "@blocknote/core";
import { describe, expect, it, vi } from "vitest";
import {
  AIAutoCompleteExtension,
  AutoCompleteSuggestion
} from "./AIAutoCompleteExtension.js";

// Helper to wait for debounce
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Common test data
const TEST_SUGGESTION = "orld";
const INITIAL_TEXT = "Hello ";
const DEBOUNCE_DELAY = 1;
const DEBOUNCE_WAIT = 200;

// Helper to create an editor with the autocomplete extension
function createTestEditor(provider: (editor: BlockNoteEditor<any, any, any>, signal: AbortSignal) => Promise<AutoCompleteSuggestion[]>) {
  return BlockNoteEditor.create({
    initialContent: [
      {
        type: "paragraph",
        content: INITIAL_TEXT,
      },
    ],
    extensions: [
      AIAutoCompleteExtension({
        provider,
        debounceDelay: DEBOUNCE_DELAY,
      }),
    ],
  });
}

// Helper to mount editor and setup cursor position
function setupMountedEditor(editor: BlockNoteEditor<any, any, any>) {
  const element = document.createElement("div");
  editor.mount(element);
  editor.setTextCursorPosition(editor.document[0].id, "end");
  return element;
}

// Helper to trigger a text change
async function triggerTextChange(element: HTMLDivElement, newText: string) {
  element.querySelector(".bn-inline-content")!.innerHTML = newText;
  await wait(DEBOUNCE_WAIT);
}

describe("AIAutoCompleteExtension", () => {
  it("fetches and displays suggestions", async () => {
    const provider = vi.fn().mockResolvedValue([{ suggestion: TEST_SUGGESTION }]);
    const editor = createTestEditor(provider);
    const element = setupMountedEditor(editor);

    await triggerTextChange(element, "Hello w");

    expect(provider).toHaveBeenCalledOnce();
    expect(element.querySelector(".bn-autocomplete-decorator")!.innerHTML).toBe(TEST_SUGGESTION);
    expect(element.querySelector(".bn-inline-content")!.textContent).toBe("Hello world");
  });

  it("handles simultaneous changes", async () => {
    // Manual promise control for testing race conditions
    let resolvePromise: () => void;
    const manualPromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });

    const provider = vi.fn().mockImplementation(async () => {
      await manualPromise;
      return [{ suggestion: TEST_SUGGESTION }];
    });

    const editor = createTestEditor(provider);
    const element = setupMountedEditor(editor);

    await triggerTextChange(element, "Hello w");
    expect(provider).toHaveBeenCalledOnce();

    // Insert a block before suggestion has been returned
    editor.insertBlocks([
      {
        type: "paragraph",
        content: "new first paragraph ",
      },
    ], editor.document[0].id, "before");

    // Resolve the promise with suggestions
    resolvePromise!();
    await wait(10);

    expect(provider).toHaveBeenCalledOnce();
    expect(element.querySelector(".bn-autocomplete-decorator")!.innerHTML).toBe(TEST_SUGGESTION);
    expect(element.querySelectorAll(".bn-inline-content")[1].textContent).toBe("Hello world");
  });

  it("accepts suggestion with Tab", async () => {
    const provider = vi.fn().mockResolvedValue([{ suggestion: TEST_SUGGESTION }]);
    const editor = createTestEditor(provider);
    const element = setupMountedEditor(editor);

    await triggerTextChange(element, "Hello w");
   
    // Simulate Tab press
    element.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));

    // Verify text inserted
    const content = editor.document[0].content as any as InlineContent<any, any>[]; 
    if (!isStyledTextInlineContent(content[0])) {
      throw new Error("Content is not styled text");
    }
    expect(content[0].text).toBe("Hello world");
  });
});