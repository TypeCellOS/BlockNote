import type { BrowserCommand } from "vite-plus/test/node";

// eslint-disable-next-line no-unused-vars -- Type-only import for the JSDoc link.
import type { userEvent } from "../transport.js";
// eslint-disable-next-line no-unused-vars -- Type-only import for the JSDoc link.
import type { selectText } from "../node/selectText.js";

/**
 * One step of an emulated IME session. `setComposition` updates the active
 * composition (starting one if none is active); `commit` finalizes it with
 * the given text — pass different text than the last composition update to
 * emulate an autocorrect-style replacement.
 */
export type ImeStep =
  | {
      type: "setComposition";
      text: string;
      selectionStart?: number;
      selectionEnd?: number;
      /**
       * With `replacementEnd`, the composition replaces this range of
       * already-committed text instead of inserting at the caret — the shape
       * of retroactive autocorrect (e.g. Gboard fixing the previous word when
       * space is typed). Offsets are in the focused editable's text.
       */
      replacementStart?: number;
      replacementEnd?: number;
    }
  | { type: "commit"; text: string };

/**
 * Drives Chromium's real IME composition pipeline over CDP
 * (`Input.imeSetComposition` / `Input.insertText`): the browser produces the
 * genuine `compositionstart/update/end` + `beforeinput:
 * insertCompositionText` sequence with actual DOM mutation, targeting the
 * focused element — the same events a mobile IME (Gboard, Samsung Keyboard)
 * generates, which no synthetic `CompositionEvent` dispatch can reproduce
 * (those are untrusted and never touch the DOM). Chromium-only.
 *
 * Use for bugs involving active composition, replacement, or IME commit semantics,
 * not ordinary text entry ({@link userEvent.keyboard}) or selection setup
 * ({@link selectText}).
 * Focus the editable and establish its caret first. This emulates browser IME
 * input, not an OS keyboard UI, candidate picker, or device-specific action key.
 *
 * @example
 * const { editor } = await setupEditor();
 * await page.getByRole("textbox").click();
 * await imeComposition([
 *   { type: "setComposition", text: "に" },
 *   { type: "setComposition", text: "日本" },
 *   { type: "commit", text: "日本" },
 * ]);
 * expect(editor.document[0].content).toEqual([
 *   { type: "text", text: "日本", styles: {} },
 * ]);
 */
export const imeComposition: BrowserCommand<[steps: ImeStep[]]> = async (
  ctx,
  steps,
) => {
  const cdp = await ctx.context.newCDPSession(ctx.page);
  try {
    for (const step of steps) {
      if (step.type === "setComposition") {
        await cdp.send("Input.imeSetComposition", {
          text: step.text,
          selectionStart: step.selectionStart ?? step.text.length,
          selectionEnd: step.selectionEnd ?? step.text.length,
          ...(step.replacementEnd !== undefined
            ? {
                replacementStart: step.replacementStart ?? 0,
                replacementEnd: step.replacementEnd,
              }
            : {}),
        });
      } else {
        await cdp.send("Input.insertText", { text: step.text });
      }
    }
  } finally {
    await cdp.detach().catch(() => {
      // Session already gone (e.g. page navigated) — nothing to clean up.
    });
  }
};
