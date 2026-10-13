import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { toolbarDocument, focusToolbarControl } from "./helpers.js";
import { openEditor, checkAxe, pressKey } from "@root/tests/a11y/helpers.js";

test("formatting toolbar: axe", async () => {
  await openEditor(toolbarDocument);
  await focusToolbarControl("Paragraph");
  await checkAxe('[role="toolbar"]');
});

test("formatting toolbar: block type menu axe", async () => {
  await openEditor(toolbarDocument);
  await focusToolbarControl("Paragraph");
  await pressKey("Enter");
  await expect.element(page.getByRole("menu")).toBeVisible();
  await checkAxe('[role="menu"]');
});

test("formatting toolbar: colors menu axe", async () => {
  await openEditor(toolbarDocument);
  await focusToolbarControl("Colors");
  await pressKey("Enter");
  await expect.element(page.getByRole("menu")).toBeVisible();
  await checkAxe('[role="menu"]');
});

test("formatting toolbar: link popover axe", async () => {
  await openEditor(toolbarDocument);
  await focusToolbarControl("Create link");
  await pressKey("Enter");
  await expect
    .element(document.querySelector<HTMLElement>(".bn-form-popover"))
    .toBeVisible();
  await checkAxe(".bn-form-popover");
});
