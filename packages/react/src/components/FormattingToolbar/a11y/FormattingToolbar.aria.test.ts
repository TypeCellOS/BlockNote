import { test } from "vite-plus/test";
import { openEditor, checkAriaSnapshot } from "@root/tests/a11y/helpers.js";
import {
  documentForToolbarItem,
  focusToolbarItem,
  activateToolbarButton,
  openToolbarMenu,
  focusNextMenuItem,
  activateMenuItem,
} from "./helpers.js";

async function setupToolbarAria(toolbarItem: string) {
  await openEditor(documentForToolbarItem(toolbarItem));
  const { toolbar } = await focusToolbarItem(toolbarItem);
  await checkAriaSnapshot(toolbar, "before activation");
  return toolbar;
}

async function checkToolbarButtonAria(toolbarButton: string) {
  const toolbar = await setupToolbarAria(toolbarButton);
  await activateToolbarButton();
  await checkAriaSnapshot(toolbar, "after activation");
}

async function checkToolbarMenuAria(toolbarMenu: string) {
  const toolbar = await setupToolbarAria(toolbarMenu);
  await openToolbarMenu();
  await focusNextMenuItem();
  await focusNextMenuItem();
  await activateMenuItem();
  await checkAriaSnapshot(toolbar, "after activation");
}

test("formatting toolbar: Paragraph", async () => {
  await checkToolbarMenuAria("Paragraph");
});

test("formatting toolbar: Bold", async () => {
  await checkToolbarButtonAria("Bold");
});

test("formatting toolbar: Italic", async () => {
  await checkToolbarButtonAria("Italic");
});

test("formatting toolbar: Underline", async () => {
  await checkToolbarButtonAria("Underline");
});

test("formatting toolbar: Strike", async () => {
  await checkToolbarButtonAria("Strike");
});

test("formatting toolbar: Align text left", async () => {
  await checkToolbarButtonAria("Align text left");
});

test("formatting toolbar: Align text center", async () => {
  await checkToolbarButtonAria("Align text center");
});

test("formatting toolbar: Align text right", async () => {
  await checkToolbarButtonAria("Align text right");
});

test("formatting toolbar: Colors", async () => {
  await checkToolbarMenuAria("Colors");
});

test("formatting toolbar: Nest block", async () => {
  await checkToolbarButtonAria("Nest block");
});

test("formatting toolbar: Unnest block", async () => {
  await checkToolbarButtonAria("Unnest block");
});
