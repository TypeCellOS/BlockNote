import { BlockNoteSchema } from "@blocknote/core";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { ReadableByteStreamController as PolyfillController } from "web-streams-polyfill";
import { reactEmailDefaultSchemaMappings } from "./defaultSchema/index.js";
import { ReactEmailExporter } from "./reactEmailExporter.jsx";

const nativeController = globalThis.ReadableByteStreamController;

afterEach(() => {
  vi.unstubAllGlobals();
});

it("installs the ponyfill's named export while rendering without a native byte stream controller", async () => {
  vi.stubGlobal("ReadableByteStreamController", undefined);
  const exporter = new ReactEmailExporter(
    BlockNoteSchema.create(),
    reactEmailDefaultSchemaMappings,
  );
  const container = vi.fn(function Container() {
    expect(globalThis.ReadableByteStreamController).toBe(PolyfillController);
    return <p>Safari polyfill render</p>;
  });

  const html = await exporter.toReactEmailDocument([], { container });

  expect(container).toHaveBeenCalled();
  expect(html).toContain("Safari polyfill render");
  expect(globalThis.ReadableByteStreamController).toBeUndefined();
});

it("preserves an existing native byte stream controller during and after rendering", async () => {
  expect(typeof nativeController).toBe("function");
  vi.stubGlobal("ReadableByteStreamController", nativeController);
  const exporter = new ReactEmailExporter(
    BlockNoteSchema.create(),
    reactEmailDefaultSchemaMappings,
  );
  const container = vi.fn(function Container() {
    expect(globalThis.ReadableByteStreamController).toBe(nativeController);
    return <p>Native stream render</p>;
  });

  const html = await exporter.toReactEmailDocument([], { container });

  expect(container).toHaveBeenCalled();
  expect(html).toContain("Native stream render");
  expect(globalThis.ReadableByteStreamController).toBe(nativeController);
});
