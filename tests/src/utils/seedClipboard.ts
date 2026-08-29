import type { BrowserCommand } from "vite-plus/test/node";

/**
 * Browser-side signature of the {@link seedClipboard} command below (Vitest
 * strips the Node-only `BrowserCommandContext` first parameter). See
 * `positionalMouse.ts` for why this can't be a `declare module` augmentation.
 */
export type SeedClipboardCommand = (text: string) => Promise<void>;

/**
 * Writes `text` to the (context-shared) system clipboard through a real copy:
 * a temporary focused input in the top-level page plus a trusted
 * ControlOrMeta+C from the Playwright keyboard. In-page approaches don't
 * work here: the async clipboard API requires a focused document and granted
 * permissions (which Firefox/WebKit contexts can't even express), and
 * `document.execCommand("copy")` returns false without a user gesture.
 *
 * Used by the copypaste suite to reset the clipboard between tests, so a
 * silently failing copy pastes an obvious sentinel instead of the previous
 * test's payload.
 */
export const seedClipboard: BrowserCommand<[text: string]> = async (
  ctx,
  text,
) => {
  await ctx.page.evaluate((value) => {
    const input = document.createElement("input");
    input.id = "__bn-seed-clipboard";
    input.value = value;
    document.body.append(input);
    input.focus();
    input.select();
  }, text);
  await ctx.page.keyboard.press("ControlOrMeta+c");
  await ctx.page.evaluate(() => {
    document.getElementById("__bn-seed-clipboard")?.remove();
  });
};
