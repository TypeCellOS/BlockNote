import axe from "axe-core";
import { expect } from "@playwright/test";
import type { BrowserCommand } from "vite-plus/test/node";

export type Outline = { width: number; style: string; color: string };
export type EditorSelection = {
  tableCell: { row: number; column: number } | null;
  blockId: string | null;
  offset: number;
  text: string;
};

declare global {
  interface Window {
    axe: typeof axe;
  }
}

/**
 * Reads computed outline width (CSS pixels), style, and color in the test iframe.
 * Pass a browser locator's `selector`, not its DOM element. Capture this before
 * focusing the target to compare against its focused appearance.
 *
 * @example
 * const unfocusedOutline = await commands.readOutline(button.selector);
 */
export const readOutline: BrowserCommand<[selector: string], Outline> = async (
  context,
  selector,
) =>
  (await context.frame()).locator(selector).evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      width: Number.parseFloat(style.outlineWidth),
      style: style.outlineStyle,
      color: style.outlineColor,
    };
  });

/**
 * Waits for the target to match `:focus-visible` and have a nonzero outline
 * whose style is neither `none` nor `hidden` and whose color is not transparent.
 * When supplied, the outline must also differ from `unfocusedOutline`.
 * Omit that baseline for autofocused inputs that cannot be observed unfocused.
 * These checks cover CSS outline properties, not contrast or visual occlusion.
 *
 * @example
 * await commands.checkFocusOutline(button.selector, unfocusedOutline);
 */
export const checkFocusOutline: BrowserCommand<
  [selector: string, unfocusedOutline?: Outline],
  void
> = async (context, selector, unfocusedOutline) => {
  const target = (await context.frame()).locator(selector);
  await expect
    .poll(() => target.evaluate((element) => element.matches(":focus-visible")))
    .toBe(true);
  // Autofocused inputs cannot be observed unfocused; compare when available.
  if (unfocusedOutline) {
    await expect
      .poll(async () => await readOutline(context, selector))
      .not.toEqual(unfocusedOutline);
  }
  await expect
    .poll(async () => (await readOutline(context, selector)).width)
    .toBeGreaterThan(0);
  await expect
    .poll(async () => (await readOutline(context, selector)).style)
    .not.toMatch(/^(none|hidden)$/);
  await expect
    .poll(async () => (await readOutline(context, selector)).color)
    .not.toMatch(/^(transparent|rgba\(0, 0, 0, 0\))$/);
};

/**
 * Reads the DOM selection in the test iframe for keyboard-navigation assertions.
 * Block ID and zero-based table coordinates refer to the selection's focus end;
 * offset is relative to its focus node. Text is the complete selected text.
 * Without a selection, returns null locations, zero offset, and empty text.
 *
 * @example
 * expect((await commands.readSelection()).blockId).toBe("end");
 */
export const readSelection: BrowserCommand<[], EditorSelection> = async (
  context,
) =>
  (await context.frame()).evaluate(() => {
    const selection = document.getSelection();
    const node = selection?.focusNode;
    const element = node instanceof Element ? node : node?.parentElement;
    const cell = element?.closest("td, th");
    const row = cell?.parentElement;
    return {
      tableCell:
        cell instanceof HTMLTableCellElement &&
        row instanceof HTMLTableRowElement
          ? { row: row.rowIndex, column: cell.cellIndex }
          : null,
      blockId: element?.closest("[data-id]")?.getAttribute("data-id") ?? null,
      offset: selection?.focusOffset ?? 0,
      text: selection?.toString() ?? "",
    };
  });

/**
 * Runs axe in the test iframe and asserts that it finds no violations, including
 * the target-size rule. `scope` is an optional CSS selector; otherwise scans the
 * document body. Returns incomplete-result messages for manual review.
 * Call after the intended UI state is ready and annotate the returned warnings
 * in the test, since annotation callbacks cannot cross the command boundary.
 *
 * @example
 * for (const warning of await commands.checkAxe('[role="toolbar"]')) {
 *   await annotate(warning, "warning");
 * }
 */
export const checkAxe: BrowserCommand<[scope?: string], string[]> = async (
  context,
  scope,
) => {
  const frame = await context.frame();
  await frame.evaluate(axe.source);
  const results = await frame.evaluate(
    (scope) =>
      window.axe.run(scope ? { include: [scope] } : document.body, {
        rules: { "target-size": { enabled: true } },
      }),
    scope,
  );
  expect(results.violations, "axe violations").toEqual([]);
  return results.incomplete.flatMap((result) =>
    result.nodes.map(
      (node) =>
        `axe manual review: ${result.id} — ${result.help}\nTarget: ${JSON.stringify(node.target)}\n${node.failureSummary ?? ""}\n${result.helpUrl}`,
    ),
  );
};

/**
 * Reads Playwright's semantic accessibility snapshot for a selector in the test
 * iframe. Compare the returned string in the test so Vitest owns the named
 * snapshot and its update policy. This does not run a native screen reader.
 *
 * @example
 * expect(await commands.readAriaSnapshot(button.selector)).toMatchSnapshot(
 *   "before activation",
 * );
 */
export const readAriaSnapshot: BrowserCommand<
  [selector: string],
  string
> = async (context, selector) =>
  (await context.frame()).locator(selector).ariaSnapshot();
