import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from "vite-plus/test";

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
      if (session) {
        await session.screenshot(`editing-final`);
        await session.annotate(
          failed ? "failed" : "passed",
          failed
            ? "basic editing suite failed; see run output"
            : "typing + soft-keyboard Enter passed",
        );
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
    });
  });
}
