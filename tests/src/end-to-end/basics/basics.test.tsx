import App from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import { waitForSelector } from "../../utils/editor.js";

beforeEach(async () => {
  render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

describe("Basic typing functionality", () => {
  test("should allow me to type content", async () => {
    const editor = await waitForSelector(EDITOR_SELECTOR);
    await userEvent.click(
      document.querySelectorAll(`${EDITOR_SELECTOR} div`)[3] as HTMLElement,
    );
    await userEvent.keyboard("hello world");
    expect(editor.textContent).toBe("hello world");
  });
});
