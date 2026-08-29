import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from "vite-plus/test";

import { activeDevices } from "./devices.js";
import { tapElement, typeAndSubmit } from "./lib/gestures.js";
import {
  docState,
  LINK_POPOVER,
  MOBILE_TOOLBAR,
  openExample,
  openLinkPopover,
  selectFirstWord,
  startEditing,
  viewportHeight,
} from "./lib/editorPage.js";
import { browserStackCredentials, DeviceSession } from "./lib/webdriver.js";

const KEYBOARD_MIN_HEIGHT = 150;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

for (const device of activeDevices()) {
  describe.skipIf(!browserStackCredentials())(
    `mobile formatting toolbar on ${device.id}`,
    () => {
      let session: DeviceSession;
      let baselineHeight: number;
      let failed = false;

      beforeAll(async () => {
        const capabilities = structuredClone(device.capabilities) as {
          "bstack:options": Record<string, unknown>;
        };
        capabilities["bstack:options"].sessionName =
          `formatting toolbar · ${device.id}`;
        session = await DeviceSession.create(device.platform, capabilities);
        await openExample(session, "/ui-components/mobile-formatting-toolbar");
        baselineHeight = await viewportHeight(session);
      });

      afterEach(({ task }) => {
        if (task.result?.state === "fail") {
          failed = true;
        }
      });

      afterAll(async () => {
        if (session) {
          await session.screenshot(`formatting-toolbar-final`);
          await session.annotate(
            failed ? "failed" : "passed",
            failed
              ? "formatting toolbar suite failed; see run output"
              : "keyboard/toolbar lifecycle + link popover flow passed",
          );
          await session.close();
        }
      });

      test("tapping the editor opens the keyboard and shows the mobile toolbar", async () => {
        await startEditing(session);

        // The toolbar only renders while `useVirtualKeyboard` sees the
        // keyboard, so its presence + the viewport drop prove the real
        // on-screen keyboard opened.
        expect(await viewportHeight(session)).toBeLessThan(
          baselineHeight - KEYBOARD_MIN_HEIGHT,
        );
      });

      test("toolbar buttons apply reliably", async () => {
        await startEditing(session);
        await selectFirstWord(session);
        // Three bold toggles; every tap must register (covers the reported
        // "buttons sometimes don't work", which traced back to a lingering
        // popover overlaying the toolbar).
        for (const expected of [true, false, true]) {
          await tapElement(session, `${MOBILE_TOOLBAR} [data-test="bold"]`, {
            keyboard: "open",
            verify: `return { ok: ${expected} === !!document.querySelector('.bn-editor strong') };`,
          });
        }
      });

      test("link popover holds focus through the IME and creates a link", async () => {
        await openLinkPopover(session);

        // Focusing an input makes the IME reconfigure (on Android this
        // resizes the viewport), which historically hid the popover and
        // collapsed the keyboard/toolbar (the Mantine `hideDetached` bug).
        // The input must still hold focus once that settles.
        await sleep(2_500);
        const survival = await session.exec<{
          focused: boolean;
          popover: boolean;
          toolbar: boolean;
        }>(`
          const active = document.activeElement;
          return {
            focused: !!(active && active.tagName === 'INPUT' && active.getAttribute('name') === 'url'),
            popover: !!document.querySelector(${JSON.stringify(LINK_POPOVER)}),
            toolbar: !!document.querySelector(${JSON.stringify(MOBILE_TOOLBAR)}),
          };`);
        await session.screenshot("link-popover-open");
        expect(survival).toEqual({
          focused: true,
          popover: true,
          toolbar: true,
        });

        await typeAndSubmit(session, `${LINK_POPOVER} input`, "example.com");

        await session.waitFor(
          "link created and popover closed",
          `return {
            ok: !!document.querySelector('.bn-editor a[href="https://example.com"]')
              && !document.querySelector(${JSON.stringify(LINK_POPOVER)}),
            link: !!document.querySelector('.bn-editor a[href="https://example.com"]'),
            popoverGone: !document.querySelector(${JSON.stringify(LINK_POPOVER)}),
          };`,
        );

        expect((await docState(session)).links).toContain(
          "https://example.com",
        );
        // Submitting must not dismiss the keyboard — but Appium's typing can
        // itself hide the keyboard as an automation side effect (observed on
        // Android), which the product can't distinguish from the user closing
        // it. So only assert the toolbar survived while the keyboard is
        // actually still up; the emulation suite covers this invariant
        // deterministically.
        if (
          (await viewportHeight(session)) <
          baselineHeight - KEYBOARD_MIN_HEIGHT
        ) {
          expect(
            await session.exec<boolean>(
              `return !!document.querySelector(${JSON.stringify(MOBILE_TOOLBAR)});`,
            ),
          ).toBe(true);
        }
      });
    },
  );
}
