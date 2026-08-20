import { isPdf, TEST_PNG_BYTES } from "@shared/util/testBytesUtil.js";
import { describe, expect, test } from "vite-plus/test";

import { compileTypstToTaggedPdf } from "./compileBrowser.js";

// Bundled wasm so the compiler initializes fully offline (no CDN).
// eslint-disable-next-line import/no-unresolved
import compilerWasmUrl from "@myriaddreamin/typst-ts-web-compiler/wasm?url";

// Browser unit tests for the actual production compile path - the wasm
// compiler the exporters ship to the browser. The node suites substitute
// @myriaddreamin/typst-ts-node-compiler, so a broken wasm wrapper (init,
// shadow-file handling, serialization) would pass every node test and only
// fail here. Runs in the tests package's browser suite. Font-less on
// purpose (`preloadDefaultFonts: false`, no font bytes): glyphs don't
// matter here, and it keeps the suite offline.
const OPTIONS = {
  getModule: () => compilerWasmUrl,
  preloadDefaultFonts: false,
} as const;

describe("compileTypstToTaggedPdf", () => {
  test("compiles markup with mapped assets", { timeout: 60000 }, async () => {
    const pdf = await compileTypstToTaggedPdf(
      `#set document(title: "t")\nHello #image("/assets/a.png", width: 10pt)`,
      { ...OPTIONS, assets: new Map([["/assets/a.png", TEST_PNG_BYTES]]) },
    );
    expect(isPdf(pdf)).toBe(true);
  });

  test(
    "serializes concurrent compiles with different assets",
    { timeout: 60000 },
    async () => {
      // Shadow files are global compiler state; without serialization one
      // compile's resetShadow lands mid-flight in the other and it fails
      // with file-not-found (the debounced re-export scenario).
      function compile(path: string) {
        return compileTypstToTaggedPdf(
          `#set document(title: "t")\n#image("${path}", width: 10pt)`,
          { ...OPTIONS, assets: new Map([[path, TEST_PNG_BYTES]]) },
        );
      }
      const [a, b] = await Promise.all([
        compile("/assets/one.png"),
        compile("/assets/two.png"),
      ]);
      expect(isPdf(a)).toBe(true);
      expect(isPdf(b)).toBe(true);
    },
  );

  test(
    "rejects a later compile that changes the init-time options",
    { timeout: 60000 },
    async () => {
      // The wasm module and fonts load once, on the first compile; silently
      // ignoring different options would leave e.g. new fonts unloaded.
      await compileTypstToTaggedPdf("ok", OPTIONS);
      await expect(
        compileTypstToTaggedPdf("ok", {
          ...OPTIONS,
          fonts: [new Uint8Array([1, 2, 3])],
        }),
      ).rejects.toThrow("already initialized");
    },
  );

  test(
    "surfaces compile errors instead of returning output",
    { timeout: 60000 },
    async () => {
      await expect(
        compileTypstToTaggedPdf("#image(unknownvariable)", OPTIONS),
      ).rejects.toThrow();
    },
  );
});
