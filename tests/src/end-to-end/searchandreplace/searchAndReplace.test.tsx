import App from "@examples/08-extensions/03-search-and-replace/src/App";
import { expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { MOD, page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import { waitForSelector } from "../../utils/editor.js";

// Engine semantics live in the core node tests. These flows exercise the real
// example's shortcut scope, focus, controls, decorations, and offscreen reveal.
async function renderExample() {
  await render(
    <>
      <input aria-label="Outside the editor" />
      <App />
    </>,
  );
  return waitForSelector(EDITOR_SELECTOR);
}

async function renderScrollableExample() {
  await render(
    <div className="scrollable-search-example">
      <style>{`.scrollable-search-example .bn-container { height: 240px; overflow-y: auto; }`}</style>
      <App />
    </div>,
  );
  const editor = await waitForSelector(EDITOR_SELECTOR);
  const scroller = await waitForSelector(
    ".scrollable-search-example .bn-container",
  );
  return { editor, scroller };
}

test("scopes Find to the editor, keeps navigation focus, and clears on Escape", async () => {
  const editor = await renderExample();
  await page.getByRole("textbox", { name: "Outside the editor" }).click();
  await userEvent.keyboard(`{${MOD}>}f{/${MOD}}`);
  expect(document.querySelector('[role="search"]')).toBeNull();

  await userEvent.click(editor);
  await userEvent.keyboard(`{${MOD}>}f{/${MOD}}`);
  const input = await waitForSelector('input[aria-label="Find in document"]');
  await expect.poll(() => document.activeElement).toBe(input);
  await userEvent.keyboard("fox");

  const firstActive = await waitForSelector('[data-search-match="active"]');
  await waitForSelector('[data-search-match="true"]');
  const initialCount = document.querySelector("output")?.textContent;
  expect(initialCount).toBeTruthy();

  await page.getByRole("button", { name: "Next match (Enter)" }).click();
  await expect.poll(() => document.activeElement).toBe(input);
  await expect
    .poll(() => document.querySelector("output")?.textContent)
    .not.toBe(initialCount);
  expect(document.querySelector('[data-search-match="active"]')).not.toBe(
    firstActive,
  );

  await userEvent.keyboard("{Shift>}{Enter}{/Shift}");
  await expect
    .poll(() => document.querySelector("output")?.textContent)
    .toBe(initialCount);
  expect(document.activeElement).toBe(input);

  // Closing clears the rendered search state and returns typing to the editor.
  await userEvent.keyboard("{Escape}");
  await expect.poll(() => document.querySelector('[role="search"]')).toBeNull();
  expect(document.querySelector("[data-search-match]")).toBeNull();
  await expect.poll(() => document.activeElement).toBe(editor);

  await userEvent.keyboard(`{${MOD}>}f{/${MOD}}`);
  await expect
    .poll(() =>
      page.getByRole("textbox", { name: "Find in document" }).element(),
    )
    .toHaveProperty("value", "");
});

test("Find opens replacement controls that replace document text and close", async () => {
  const editor = await renderExample();
  const findInput = page.getByRole("textbox", {
    name: "Find in document",
  });
  const replacementInput = page.getByRole("textbox", {
    name: "Replace with",
  });
  const replaceButton = page.getByRole("button", {
    name: "Replace",
    exact: true,
  });
  const replaceAllButton = page.getByRole("button", {
    name: "Replace all",
    exact: true,
  });

  await page.getByRole("button", { name: "Find", exact: true }).click();
  await expect.poll(() => document.activeElement).toBe(findInput.element());
  expect(document.querySelector('input[aria-label="Replace with"]')).toBeNull();

  await page.getByRole("button", { name: "Show replacement controls" }).click();
  await findInput.fill("fox");
  await replacementInput.fill("otter");
  await waitForSelector('[data-search-match="active"]');

  // Observe edits in the document, not just a changed search counter.
  await replaceButton.click();
  await expect
    .poll(() => editor.textContent)
    .toContain("The otter field guide");
  expect(editor.textContent).toMatch(/fox/i);

  await replaceAllButton.click();
  // No count/index permutations here: the core suite covers replacement rules.
  await expect.poll(() => editor.textContent).not.toMatch(/fox/i);
  await expect
    .poll(() => document.querySelector("[data-search-match]"))
    .toBeNull();

  await page.getByRole("button", { name: "Hide replacement controls" }).click();
  await expect
    .poll(() => document.querySelector('input[aria-label="Replace with"]'))
    .toBeNull();
  await page.getByRole("button", { name: "Close search (Escape)" }).click();
  await expect.poll(() => document.querySelector('[role="search"]')).toBeNull();
  await expect.poll(() => document.activeElement).toBe(editor);
});

test("Find-button navigation reveals an offscreen match without focusing the editor", async () => {
  const { editor, scroller } = await renderScrollableExample();
  expect(editor.contains(document.activeElement)).toBe(false);

  // Never click the document: reveal must work while its selection is elsewhere.
  await page.getByRole("button", { name: "Find", exact: true }).click();
  const input = await waitForSelector('input[aria-label="Find in document"]');
  await expect.poll(() => document.activeElement).toBe(input);
  await userEvent.keyboard("Woodland");
  const active = await waitForSelector('[data-search-match="active"]');
  expect(active.textContent).toBe("Woodland");
  // Highlighting also reveals the match. Cancel that smooth scroll and reset
  // instantly so navigation starts with the active match offscreen.
  scroller.scrollTo({ top: 0, behavior: "instant" });
  // Establish that this interaction actually needs to scroll before navigating.
  expect(active.getBoundingClientRect().top).toBeGreaterThanOrEqual(
    scroller.getBoundingClientRect().bottom,
  );

  // The only match is already selected; navigation must still reveal it.
  // Check visibility, not exact scroll offsets or native method calls.
  await page.getByRole("button", { name: "Next match (Enter)" }).click();
  await expect
    .poll(() => {
      const matchBounds = active.getBoundingClientRect();
      const viewportBounds = scroller.getBoundingClientRect();
      return (
        matchBounds.top >= viewportBounds.top &&
        matchBounds.bottom <= viewportBounds.bottom
      );
    })
    .toBe(true);
  await expect.poll(() => document.activeElement).toBe(input);
});
