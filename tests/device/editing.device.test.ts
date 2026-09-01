import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";

import { activeDevices } from "./devices.js";
import { pressSoftKeyboardEnter, typeText } from "./lib/gestures.js";
import {
  docState,
  EDITOR,
  openExample,
  startEditing,
} from "./lib/editorPage.js";
import type { DeviceSession } from "./lib/session.js";

/**
 * Basic text-editing behavior on real devices. These flows go through the
 * actual IME wherever it matters: soft-keyboard Enter on Android is delivered
 * as keyCode 229 + `beforeinput`, a path that synthetic key events cannot
 * exercise and that has broken in the wild (TypeCellOS/BlockNote#3001 — Enter
 * inserting a space or doing nothing instead of creating a block).
 */
for (const device of await activeDevices()) {
  describe(`basic editing on ${device.id}`, () => {
    let session: DeviceSession;

    beforeAll(async () => {
      session = await device.createSession();
      await openExample(session, "/ui-components/mobile-formatting-toolbar");
    });

    afterAll(async () => {
      if (session) {
        await session.screenshot(`editing-final`);
        await session.close();
      }
    });

    test("typing lands in the document", async () => {
      await startEditing(session);
      const before = await docState(session);

      await typeText(session, EDITOR, "bndevicetyping");

      const after = await session.waitFor<{ ok: boolean; text: string }>(
        "typed text present",
        `const editor = document.querySelector(${JSON.stringify(EDITOR)});
           return { ok: editor.textContent.includes("bndevicetyping"), text: editor.textContent.slice(0, 120) };`,
      );
      expect(after.ok).toBe(true);
      // Typing must not have destroyed surrounding content.
      expect((await docState(session)).blockCount).toBeGreaterThanOrEqual(
        before.blockCount,
      );
    });

    test("soft-keyboard Enter creates a new block (#3001)", async () => {
      await startEditing(session);
      const before = await docState(session);

      // Record how the Enter reaches the page, to prove the route as well as
      // the effect: on Android the on-screen key must arrive as the IME
      // sequence (keydown 229 + beforeinput insertParagraph), which is the
      // exact path #3001 broke and no key event can produce.
      await session.exec(
        `window.__route = [];
         const editor = document.querySelector(${JSON.stringify(EDITOR)});
         editor.addEventListener("keydown", (e) => window.__route.push("keydown:" + e.keyCode), { capture: true });
         editor.addEventListener("beforeinput", (e) => window.__route.push("beforeinput:" + e.inputType), { capture: true });`,
      );

      // "Any observable document mutation" stops the key-position ladder;
      // what the mutation *was* is classified below.
      await pressSoftKeyboardEnter(
        session,
        `const editor = document.querySelector(${JSON.stringify(EDITOR)});
           const blocks = editor.querySelectorAll('[data-node-type="blockContainer"]').length;
           return { ok: blocks !== ${before.blockCount} || editor.textContent !== ${JSON.stringify(before.text)} };`,
      );

      const after = await docState(session);
      await session.screenshot("after-soft-enter");

      // Classify the IME's effect so a failure names the bug it found:
      // - block count +1        -> correct
      // - text grew by a space  -> the #3001 signature
      // - text shrank           -> the ladder hit backspace; key ratios need
      //                            tuning for this device (see gestures.ts)
      const gainedSpace =
        after.blockCount === before.blockCount &&
        after.text.length === before.text.length + 1 &&
        after.text.includes(" ");
      expect(
        after.blockCount,
        gainedSpace
          ? "soft Enter inserted a space instead of a new block (TypeCellOS/BlockNote#3001)"
          : `soft Enter did not create a block (text before: ${JSON.stringify(before.text.slice(0, 60))}, after: ${JSON.stringify(after.text.slice(0, 60))})`,
      ).toBe(before.blockCount + 1);

      if (device.kind === "local-android") {
        // The backend taps the IME's actual on-screen key, so the page must
        // have seen an IME-mediated delivery — a keydown 229 — and not just
        // a synthesized key event (which would arrive as a bare keydown 13,
        // exactly what `adb input keyevent` produces). Which variant follows
        // the 229 differs by keyboard build: phone Gboard emits
        // `beforeinput: insertParagraph` (the route the beforeinput
        // interception handles), this emulator's AOSP LatinIME emits a real
        // keydown 13 (the route the keypress interception handles). Both are
        // genuine IME routes; both must create the block.
        const route = await session.exec<string[]>(`return window.__route;`);
        expect(
          route.some((entry) => entry === "keydown:229"),
          `expected an IME-mediated delivery (keydown 229), saw: ${route.join(", ")}`,
        ).toBe(true);
      }
    });
  });
}
