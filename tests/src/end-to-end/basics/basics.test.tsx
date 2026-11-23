import "@blocknote/core/fonts/inter.css";
import { describe, expect } from "vite-plus/test";
import { userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import { waitForSelector } from "../../utils/editor.js";

describe("Basic typing functionality", () => {
  it("should allow me to type content", async ({ setupEditor }) => {
    await setupEditor();
    const editor = await waitForSelector(EDITOR_SELECTOR);
    await userEvent.click(
      document.querySelectorAll(`${EDITOR_SELECTOR} div`)[3] as HTMLElement,
    );
    await userEvent.keyboard("hello world");
    expect(editor.textContent).toBe("hello world");
  });
});
