import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";

import { activeDevices } from "./devices.js";
import { tapElement } from "./lib/gestures.js";
import {
  docState,
  MOBILE_TOOLBAR,
  openExample,
  startEditing,
  viewportHeight,
} from "./lib/editorPage.js";
import {
  LINK_POPOVER,
  openLinkPopover,
  selectFirstWord,
  typeAndSubmit,
} from "./linkPopover.js";
import type { DeviceSession } from "./lib/session.js";

const KEYBOARD_MIN_HEIGHT = 150;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

for (const device of await activeDevices()) {
  describe(`mobile formatting toolbar on ${device.id}`, () => {
    let session: DeviceSession;
    let baselineHeight: number;

    beforeAll(async () => {
      session = await device.createSession();
      await openExample(session, "/ui-components/mobile-formatting-toolbar");
      baselineHeight = await viewportHeight(session);
    });

    afterAll(async () => {
      if (session) {
        await session.screenshot(`formatting-toolbar-final`);
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
      // Captured before the popover opens: iOS Safari auto-zooms the page
      // when an input with a computed font-size under 16px takes focus, and
      // that zoom perturbs the visual viewport the mobile toolbar positions
      // itself from. The `pointer: coarse` rule in blocknoteStyles.css
      // prevents it; this pins the behaviour rather than the rule.
      const scaleBefore = await session.exec<number>(
        `return window.visualViewport ? window.visualViewport.scale : 1;`,
      );

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

      // Focusing the URL input must not have zoomed the page.
      const scaleAfter = await session.exec<number>(
        `return window.visualViewport ? window.visualViewport.scale : 1;`,
      );
      expect(
        scaleAfter,
        `focusing the URL input zoomed the page (${scaleBefore} -> ${scaleAfter}); ` +
          `check the pointer:coarse font-size rule for .bn-form-popover inputs`,
      ).toBeLessThanOrEqual(scaleBefore + 0.01);

      expect(survival).toEqual({
        focused: true,
        popover: true,
        toolbar: true,
      });

      await typeAndSubmit(
        session,
        `${LINK_POPOVER} input`,
        "example.com",
        `return {
            ok: !!document.querySelector('.bn-editor a[href="https://example.com"]')
              && !document.querySelector(${JSON.stringify(LINK_POPOVER)}),
            link: !!document.querySelector('.bn-editor a[href="https://example.com"]'),
            popoverGone: !document.querySelector(${JSON.stringify(LINK_POPOVER)}),
          };`,
      );

      expect((await docState(session)).links).toContain("https://example.com");
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

    // The flow that used to be a manual release-checklist item: Android's
    // IME decides what its action key does — with a lone text field outside
    // a <form> it picks "Next" (advance focus, no key event at all), the
    // original create-link bug. Only a backend that can press the on-screen
    // keyboard can test the IME's actual choice.
    test.skipIf(device.kind !== "local-android")(
      "the IME action key submits the link popover",
      async () => {
        // Fresh document — the earlier tests linked the first word, and a
        // linked selection opens the *edit* popover (pre-filled URL) instead
        // of the create popover this flow is about.
        await openExample(session, "/ui-components/mobile-formatting-toolbar");
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

        // The action must not have advanced focus out of the editor — that
        // was the original bug's symptom (focus jumping to the next editor).
        const state = await session.exec<{ inFirstEditor: boolean }>(
          `const editors = [...document.querySelectorAll(".bn-editor")];
           return { inFirstEditor: editors[0].contains(document.activeElement) };`,
        );
        expect(state.inFirstEditor).toBe(true);
      },
    );
  });
}
