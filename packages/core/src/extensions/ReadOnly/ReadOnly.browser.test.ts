import { afterEach, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { ReadOnlyExtension } from "./ReadOnly.js";

const cleanups: (() => void)[] = [];

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
});

it("exposes read-only content as a document and restores input semantics", () => {
  const editor = BlockNoteEditor.create();
  const host = document.createElement("div");
  document.body.append(host);
  editor.mount(host);
  cleanups.push(() => {
    editor.unmount();
    host.remove();
  });
  const readOnly = editor.getExtension(ReadOnlyExtension)!;
  expect(host.getAttribute("role")).toBe("textbox");
  expect(host.getAttribute("aria-autocomplete")).toBe("list");
  editor.isEditable = false;
  expect(host.getAttribute("role")).toBe("document");
  expect(host.hasAttribute("aria-autocomplete")).toBe(false);
  expect(host.hasAttribute("aria-haspopup")).toBe(false);
  readOnly.setReadOnly(true, "preview");
  editor.isEditable = true;
  expect(host.getAttribute("role")).toBe("document");
  readOnly.setReadOnly(false, "preview");
  expect(host.getAttribute("role")).toBe("textbox");
  expect(host.getAttribute("aria-haspopup")).toBe("listbox");
});
