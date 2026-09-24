import App from "@examples/03-ui-components/21-keyboard-block-actions/src/App";
import { beforeEach, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { MOD, page, userEvent } from "../../utils/context.js";
import { waitForSelector } from "../../utils/editor.js";

const blockSelector = '[data-node-type="blockContainer"][data-id]';

async function focusBlock(id: string) {
  await userEvent.click(
    await waitForSelector(`[data-id="${id}"] .bn-inline-content`),
  );
  await userEvent.keyboard("{Home}{ArrowRight}{ArrowRight}");
  await expect.element(page.getByRole("textbox")).toHaveFocus();
  await expect
    .poll(() => {
      const anchor = window.getSelection()?.anchorNode;
      const element =
        anchor instanceof Element ? anchor : anchor?.parentElement;
      return element?.closest(blockSelector)?.getAttribute("data-id");
    })
    .toBe(id);
}

async function openActions() {
  await userEvent.keyboard("{Shift>}{F10}{/Shift}");
  await expect.element(page.getByRole("menu")).toBeVisible();
}

beforeEach(async () => {
  await page.viewport(1280, 720);
  // Render the portable example directly, without a playground provider.
  await render(<App />);
  await waitForSelector(".bn-editor");
});

describe("Keyboard block actions example", () => {
  test("the visible button exposes the menu state and relationship", async () => {
    const trigger = page.getByRole("button", {
      name: "Block actions",
      exact: true,
    });
    await expect.element(trigger).toHaveAttribute("aria-haspopup", "menu");
    await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
    await expect.element(trigger).not.toHaveAttribute("aria-controls");

    await userEvent.click(trigger);
    await expect.element(trigger).toHaveAttribute("aria-expanded", "true");
    await expect
      .element(trigger)
      .toHaveAttribute("aria-controls", "keyboard-block-actions-menu");
    await expect
      .element(page.getByRole("menu"))
      .toHaveAttribute("id", "keyboard-block-actions-menu");

    await userEvent.keyboard("{Escape}");
    await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
    await expect.element(trigger).not.toHaveAttribute("aria-controls");
  });

  test("opens on the first action and restores the exact caret after Escape or Tab", async () => {
    await focusBlock("paragraph");
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;
    const anchorOffset = selection?.anchorOffset;
    expect(anchorNode).toBeTruthy();

    for (const key of ["{Escape}", "{Tab}"]) {
      await openActions();
      await expect
        .element(page.getByRole("menuitem", { name: "Add paragraph below" }))
        .toHaveFocus();
      await userEvent.keyboard(key);
      await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
      await expect
        .poll(() => document.activeElement?.classList.contains("bn-editor"))
        .toBe(true);
      expect(window.getSelection()?.anchorNode).toBe(anchorNode);
      expect(window.getSelection()?.anchorOffset).toBe(anchorOffset);
    }
  });

  test("preserves the editor's Tab indentation shortcut", async () => {
    await focusBlock("last");
    await userEvent.keyboard("{Tab}");
    await expect
      .poll(() =>
        document
          .querySelector('[data-id="last"]')
          ?.parentElement?.closest(blockSelector)
          ?.getAttribute("data-id"),
      )
      .toBe("parent");
    await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
    await expect
      .poll(() =>
        document
          .querySelector('[data-id="last"]')
          ?.parentElement?.closest(blockSelector),
      )
      .toBeNull();
  });

  test("duplicates a nested block with unique parent and descendant IDs", async () => {
    await focusBlock("parent");
    const originalIds = Array.from(
      document.querySelectorAll(blockSelector),
      (block) => block.getAttribute("data-id"),
    );
    await openActions();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
    await expect
      .poll(() => document.querySelectorAll(blockSelector).length)
      .toBe(originalIds.length + 2);
    const blocks = Array.from(document.querySelectorAll(blockSelector));
    const ids = blocks.map((block) => block.getAttribute("data-id"));
    expect(new Set(ids).size).toBe(ids.length);
    const copiedParent = blocks.find(
      (block) =>
        !originalIds.includes(block.getAttribute("data-id")) &&
        block.querySelector(".bn-inline-content")?.textContent ===
          "A block with a child",
    );
    expect(copiedParent).toBeTruthy();
    expect(copiedParent?.querySelector(blockSelector)?.textContent).toContain(
      "Try the shortcut in this nested block.",
    );
  });

  test("deletes the current block and restores its content with native undo", async () => {
    await focusBlock("paragraph");
    await openActions();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    await expect
      .poll(() => document.querySelector('[data-id="paragraph"]'))
      .toBeNull();
    await expect
      .poll(() => document.activeElement?.classList.contains("bn-editor"))
      .toBe(true);
    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`);
    const restored = await waitForSelector('[data-id="paragraph"]');
    expect(restored.textContent).toContain("Keep your caret here.");
  });

  test("explains unsupported selections and disables read-only actions", async () => {
    await focusBlock("paragraph");
    // Extend a native range across blocks without OS-specific Select All behavior.
    await userEvent.keyboard("{Shift>}{ArrowUp}{/Shift}");
    await expect
      .element(page.getByRole("button", { name: "Block actions", exact: true }))
      .toBeDisabled();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("Select a single block");
    await userEvent.keyboard("{ArrowRight}");
    await expect
      .element(page.getByRole("button", { name: "Block actions", exact: true }))
      .toBeEnabled();
    await userEvent.click(page.getByLabelText("Read-only"));
    await expect
      .element(page.getByRole("button", { name: "Block actions", exact: true }))
      .toBeDisabled();
    await expect
      .poll(() =>
        document.querySelector(".bn-editor")?.getAttribute("contenteditable"),
      )
      .toBe("false");
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
  });

  test("keeps the keyboard menu inside a narrow viewport", async () => {
    await page.viewport(390, 844);
    await focusBlock("paragraph");
    await openActions();
    const menu = await waitForSelector('[role="menu"]');
    await expect
      .poll(() => menu.getBoundingClientRect().left)
      .toBeGreaterThanOrEqual(0);
    await expect
      .poll(() => menu.getBoundingClientRect().right)
      .toBeLessThanOrEqual(window.innerWidth);
    await expect
      .poll(() => menu.getBoundingClientRect().top)
      .toBeGreaterThanOrEqual(0);
    await expect
      .poll(() => menu.getBoundingClientRect().bottom)
      .toBeLessThanOrEqual(window.innerHeight);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth,
    );
    await userEvent.keyboard("{Escape}");
  });
});
