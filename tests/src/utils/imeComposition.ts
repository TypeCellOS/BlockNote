import type { BrowserCommand } from "vite-plus/test/node";

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
 * Browser-side signature of the {@link imeComposition} command (Vitest strips
 * the Node-only context parameter — see positionalMouse.ts for the pattern).
 */
export type ImeCompositionCommand = (steps: ImeStep[]) => Promise<void>;

/**
 * Drives Chromium's real IME composition pipeline over CDP
 * (`Input.imeSetComposition` / `Input.insertText`): the browser produces the
 * genuine `compositionstart/update/end` + `beforeinput:
 * insertCompositionText` sequence with actual DOM mutation, targeting the
 * focused element — the same events a mobile IME (Gboard, Samsung Keyboard)
 * generates, which no synthetic `CompositionEvent` dispatch can reproduce
 * (those are untrusted and never touch the DOM). Chromium-only.
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
