import App from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import { expectElement, sleep, waitForSelector } from "../../utils/editor.js";
import { moveMouseOverElement } from "../../utils/mouse.js";

beforeEach(async () => {
  render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

describe("Basic placeholder functionality", () => {
  test("should show placeholder on load", async () => {
    await moveMouseOverElement(
      document.querySelectorAll(`${EDITOR_SELECTOR} div`)[3] as HTMLElement,
    );

    // TODO: doesn't work. No way to access text of ::before element?
    // expect(editor.textContent).toBe(
    //   "Enter text or type '/' for commands"
    // );
    await sleep(1000);
    await expectElement(document.body).toMatchScreenshot("initial-placeholder");
  });
});
