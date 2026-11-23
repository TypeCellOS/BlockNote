import { expect, it, vi } from "vite-plus/test";

it("does not install globals on first import or when creating a document", async () => {
  expect(globalThis.window).toBeUndefined();
  expect(globalThis.document).toBeUndefined();
  // Do not reuse a module already evaluated by another test.
  vi.resetModules();
  const { getDocument } = await import("./dom.js");
  expect(globalThis.window).toBeUndefined();
  expect(globalThis.document).toBeUndefined();

  const document = getDocument();
  try {
    expect(document.defaultView?.document).toBe(document);
    expect(globalThis.window).toBeUndefined();
    expect(globalThis.document).toBeUndefined();
  } finally {
    document.defaultView?.close();
  }
});
