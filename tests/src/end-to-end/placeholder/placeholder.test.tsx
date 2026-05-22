import App from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, test } from "vite-plus/test";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import { matchPageScreenshot, sleep } from "../../utils/editor.js";
import { moveMouseOverElement } from "../../utils/mouse.js";
import { renderEditor } from "../../utils/render.js";

beforeEach(async () => {
  await renderEditor(<App />);
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
    await matchPageScreenshot("initial-placeholder");
  });
});
