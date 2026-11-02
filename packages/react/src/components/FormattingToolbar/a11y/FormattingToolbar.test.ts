import { toolbarDocument, nestedToolbarDocument } from "./fixtures.js";
import { expect, test, vi, afterEach } from "vite-plus/test";
import { openEditor, spyOnEditorFunction } from "@root/tests/a11y/helpers.js";
import {
  focusToolbarItem,
  activateToolbarButton,
  openToolbarMenu,
  focusNextMenuItem,
  activateMenuItem,
} from "./helpers.js";

afterEach(() => vi.restoreAllMocks());

test("formatting toolbar: Bold", async () => {
  const editor = await openEditor(toolbarDocument);
  const command = spyOnEditorFunction(editor, "toggleStyles");
  await focusToolbarItem("Bold");
  await activateToolbarButton();
  expect(command).toHaveBeenCalledExactlyOnceWith({ bold: true });
});

test("formatting toolbar: Italic", async () => {
  const editor = await openEditor(toolbarDocument);
  const command = spyOnEditorFunction(editor, "toggleStyles");
  await focusToolbarItem("Italic");
  await activateToolbarButton();
  expect(command).toHaveBeenCalledExactlyOnceWith({ italic: true });
});

test("formatting toolbar: Underline", async () => {
  const editor = await openEditor(toolbarDocument);
  const command = spyOnEditorFunction(editor, "toggleStyles");
  await focusToolbarItem("Underline");
  await activateToolbarButton();
  expect(command).toHaveBeenCalledExactlyOnceWith({ underline: true });
});

test("formatting toolbar: Strike", async () => {
  const editor = await openEditor(toolbarDocument);
  const command = spyOnEditorFunction(editor, "toggleStyles");
  await focusToolbarItem("Strike");
  await activateToolbarButton();
  expect(command).toHaveBeenCalledExactlyOnceWith({ strike: true });
});

test("formatting toolbar: Align text left", async () => {
  const editor = await openEditor(toolbarDocument);
  const block = editor.getBlock("format")!;
  const command = spyOnEditorFunction(editor, "updateBlock");
  await focusToolbarItem("Align text left");
  await activateToolbarButton();
  expect(command).toHaveBeenCalledExactlyOnceWith(block, {
    props: { textAlignment: "left" },
  });
});

test("formatting toolbar: Align text center", async () => {
  const editor = await openEditor(toolbarDocument);
  const block = editor.getBlock("format")!;
  const command = spyOnEditorFunction(editor, "updateBlock");
  await focusToolbarItem("Align text center");
  await activateToolbarButton();
  expect(command).toHaveBeenCalledExactlyOnceWith(block, {
    props: { textAlignment: "center" },
  });
});

test("formatting toolbar: Align text right", async () => {
  const editor = await openEditor(toolbarDocument);
  const block = editor.getBlock("format")!;
  const command = spyOnEditorFunction(editor, "updateBlock");
  await focusToolbarItem("Align text right");
  await activateToolbarButton();
  expect(command).toHaveBeenCalledExactlyOnceWith(block, {
    props: { textAlignment: "right" },
  });
});

test("formatting toolbar: Colors", async () => {
  const editor = await openEditor(toolbarDocument);
  const command = spyOnEditorFunction(editor, "addStyles");
  await focusToolbarItem("Colors");
  await openToolbarMenu();
  await focusNextMenuItem();
  await focusNextMenuItem();
  await activateMenuItem();
  expect(command).toHaveBeenCalledExactlyOnceWith({ textColor: "gray" });
});

test("formatting toolbar: Nest block", async () => {
  const editor = await openEditor(toolbarDocument);
  const command = spyOnEditorFunction(editor, "nestBlock");
  await focusToolbarItem("Nest block");
  await activateToolbarButton();
  expect(command).toHaveBeenCalledExactlyOnceWith();
});

test("formatting toolbar: Unnest block", async () => {
  const editor = await openEditor(nestedToolbarDocument);
  const command = spyOnEditorFunction(editor, "unnestBlock");
  await focusToolbarItem("Unnest block");
  await activateToolbarButton();
  expect(command).toHaveBeenCalledExactlyOnceWith();
});

test("formatting toolbar: Paragraph", async () => {
  const editor = await openEditor(toolbarDocument);
  const block = editor.getBlock("format")!;
  const command = spyOnEditorFunction(editor, "updateBlock");
  await focusToolbarItem("Paragraph");
  await openToolbarMenu();
  await focusNextMenuItem();
  await focusNextMenuItem();
  await activateMenuItem();
  expect(command).toHaveBeenCalledExactlyOnceWith(block, {
    type: "heading",
    props: { level: 1, isToggleable: false },
  });
});
