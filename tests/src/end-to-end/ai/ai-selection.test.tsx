import App from "@examples/09-ai/01-minimal/src/App";
import { beforeEach, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import { focusOnEditor, sleep, waitForSelector } from "../../utils/editor.js";
import { clickAt, getRect } from "../../utils/mouse.js";

const AI_BUTTON_SELECTOR = `[data-test="editwithAI"]`;

beforeEach(async () => {
  render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

describe("AI toolbar button should preserve selection (issue #2525)", () => {
  test("Editor selection must be preserved after clicking the AI toolbar button", async () => {
    await focusOnEditor();

    // Select text in the first paragraph
    await userEvent.keyboard("{Home}");
    await userEvent.keyboard("{Shift>}{End}{/Shift}");
    await sleep(500);

    // Record the PM selection before clicking
    const pm = (window as any).ProseMirror;
    const selBefore = {
      from: pm.state.selection.from,
      to: pm.state.selection.to,
    };
    expect(selBefore.to - selBefore.from).toBeGreaterThan(0);

    // Click the AI button using the real browser mouse to trigger real
    // focus-shift behavior (a synthetic locator click bypasses it)
    const aiButton = await waitForSelector(AI_BUTTON_SELECTOR);
    const box = getRect(aiButton);
    await clickAt(box.x + box.width / 2, box.y + box.height / 2);

    // Wait for AI menu to appear
    await waitForSelector(".bn-combobox-input input, .bn-combobox input");

    // The PM selection must match what we had before clicking.
    // Without skipping refs.setReference for in-editor references while
    // FloatingFocusManager is active, floating-ui inserts a focus-return
    // element into the PM contenteditable, triggering its MutationObserver
    // and resetting the selection.
    const selAfter = {
      from: pm.state.selection.from,
      to: pm.state.selection.to,
    };
    expect(selAfter.from).toBe(selBefore.from);
    expect(selAfter.to).toBe(selBefore.to);
  });
});
