import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from "vite-plus/test";

import { activeDevices } from "./devices.js";
import { openExample, startEditing } from "./lib/editorPage.js";
import type { DeviceSession } from "./lib/session.js";
import { LINK_POPOVER, openLinkPopover } from "./linkPopover.js";

/**
 * The one flow no cloud automation can exercise: pressing the on-screen
 * keyboard's own IME action key. Android's IME decides for itself which
 * action that key performs — with a lone text field outside a `<form>` it
 * picks "Next" (advance focus, no key event at all), which was the original
 * create-link bug. Being inside a real `<form>` is what makes it offer a
 * submitting action instead.
 *
 * Only backends with an OS-level input channel to the keyboard run this —
 * today, the local Android emulator (real Chrome, real Gboard). Everywhere
 * else the IME's choice used to be a manual release-checklist item; this test
 * is that checklist item, automated.
 */
const targets = (await activeDevices()).filter(
  (device) => device.platform === "android" && device.kind === "local-android",
);

for (const device of targets) {
  describe(`IME action key on ${device.id}`, () => {
    let session: DeviceSession;
    let failed = false;

    beforeAll(async () => {
      session = await device.createSession();
      await openExample(session, "/ui-components/mobile-formatting-toolbar");
    });

    afterEach(({ task }) => {
      if (task.result?.state === "fail") {
        failed = true;
      }
    });

    afterAll(async () => {
      if (failed) {
        await session.screenshot("ime-action-failed");
      }
      await session.annotate(
        failed ? "failed" : "passed",
        "IME action key submits the link popover",
      );
      await session.close();
    });

    test("the IME action key submits the link popover", async () => {
      await startEditing(session);
      await openLinkPopover(session);

      await session.elementValue(`${LINK_POPOVER} input`, "example.com");

      if (!session.pressImeActionKey) {
        throw new Error("this target must expose the IME action key");
      }
      await session.pressImeActionKey(
        `return {
          ok: !!document.querySelector('.bn-editor a[href="https://example.com"]')
            && !document.querySelector(${JSON.stringify(LINK_POPOVER)}),
          link: !!document.querySelector('.bn-editor a[href="https://example.com"]'),
          popoverGone: !document.querySelector(${JSON.stringify(LINK_POPOVER)}),
        };`,
      );

      // The action must not have advanced focus out of the editor — that was
      // the original bug's symptom (focus jumping to the next editor).
      const state = await session.exec<{ inFirstEditor: boolean }>(
        `const editors = [...document.querySelectorAll(".bn-editor")];
         return { inFirstEditor: editors[0].contains(document.activeElement) };`,
      );
      expect(state.inFirstEditor).toBe(true);
    });
  });
}
