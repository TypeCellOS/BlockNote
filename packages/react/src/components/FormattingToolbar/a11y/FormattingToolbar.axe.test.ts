import { toolbarDocument } from "./fixtures.js";
import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { focusToolbarItem } from "./helpers.js";
import { openEditor, checkAxe, pressKey } from "@root/tests/a11y/helpers.js";

test("formatting toolbar: axe", async ({ annotate }) => {
  await openEditor(toolbarDocument);
  await focusToolbarItem("Paragraph");
  await checkAxe(annotate, '[role="toolbar"]');
});

// Mantine inserts a focusable div inside the menu, triggering axe aria-required-children violations.
test.skip("formatting toolbar: block type menu axe", async ({ annotate }) => {
  await openEditor(toolbarDocument);
  await focusToolbarItem("Paragraph");
  await pressKey("Enter");
  await expect.element(page.getByRole("menu")).toBeVisible();
  await checkAxe(annotate, '[role="menu"]');
});

// Mantine inserts a focusable div inside the menu, triggering axe aria-required-children violations.
test.skip("formatting toolbar: colors menu axe", async ({ annotate }) => {
  await openEditor(toolbarDocument);
  await focusToolbarItem("Colors");
  await pressKey("Enter");
  await expect.element(page.getByRole("menu")).toBeVisible();
  await checkAxe(annotate, '[role="menu"]');
});

test("formatting toolbar: link popover axe", async ({ annotate }) => {
  await openEditor(toolbarDocument);
  await focusToolbarItem("Create link");
  await pressKey("Enter");
  await expect
    .element(document.querySelector<HTMLElement>(".bn-form-popover"))
    .toBeVisible();
  await checkAxe(annotate, ".bn-form-popover");
});
