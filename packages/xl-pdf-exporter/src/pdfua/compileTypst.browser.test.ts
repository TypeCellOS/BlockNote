import { isPdf, TEST_PNG_BYTES } from "@shared/util/testBytesUtil.js";
import { describe, expect, test } from "vite-plus/test";

import { compileTypstToPdf } from "./compileTypst.js";

// Bundled wasm so the compiler initializes fully offline.
// eslint-disable-next-line import/no-unresolved
import compilerWasmUrl from "@blocknote/xl-typst-compiler/wasm?url";

// Browser unit tests for the actual production compile path - the wasm
// compiler the exporters ship to the browser, loaded through the bundler
// like an app would. The node suites drive the same wasm from bytes, so
// what only this suite can catch is URL-based module loading and
// browser-side glue. Font-less on purpose: glyphs don't matter here, and
// it keeps the suite fast.
const OPTIONS = {
  wasm: new URL(compilerWasmUrl, document.baseURI),
} as const;

function expectPdf(
  result: Awaited<ReturnType<typeof compileTypstToPdf>>,
): Uint8Array {
  if (result.error) {
    throw new Error(result.compileErrors.map((d) => d.message).join(" | "));
  }
  return result.pdf;
}

describe("compileTypstToPdf", () => {
  test("compiles markup with mapped assets", { timeout: 60000 }, async () => {
    const pdf = expectPdf(
      await compileTypstToPdf(
        `#set document(title: "t")\nHello #image("/assets/a.png", width: 10pt, alt: "a")`,
        { ...OPTIONS, assets: new Map([["/assets/a.png", TEST_PNG_BYTES]]) },
      ),
    );
    expect(isPdf(pdf)).toBe(true);
  });

  test(
    "keeps concurrent compiles with different assets independent",
    { timeout: 60000 },
    async () => {
      // Assets are per-compile inputs (not shared compiler state), so
      // overlapping exports - the debounced re-export scenario - cannot
      // read each other's files.
      async function compile(path: string) {
        return expectPdf(
          await compileTypstToPdf(
            `#set document(title: "t")\n#image("${path}", width: 10pt, alt: "a")`,
            { ...OPTIONS, assets: new Map([[path, TEST_PNG_BYTES]]) },
          ),
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
    "accepts different fonts on later compiles",
    { timeout: 60000 },
    async () => {
      // A per-compile font set was impossible under the previous
      // page-singleton engine (fonts were fixed by the first compile);
      // compilers are now per-font-set instances, so this must just work.
      // Invalid font bytes are ignored (0 faces), not fatal.
      const first = expectPdf(await compileTypstToPdf("one", OPTIONS));
      const second = expectPdf(
        await compileTypstToPdf("two", {
          ...OPTIONS,
          fonts: [new Uint8Array([1, 2, 3])],
        }),
      );
      expect(isPdf(first)).toBe(true);
      expect(isPdf(second)).toBe(true);
    },
  );

  test(
    "returns typed diagnostics instead of output for broken markup",
    { timeout: 60000 },
    async () => {
      const result = await compileTypstToPdf(
        "#image(unknownvariable)",
        OPTIONS,
      );
      expect(result.error).toBe("compile-failed");
      if (result.error) {
        expect(result.compileErrors[0].message).toContain("unknown variable");
      }
    },
  );

  test(
    "produces declared PDF/UA-1 with the ua-1 standard",
    { timeout: 60000 },
    async () => {
      const pdf = expectPdf(
        await compileTypstToPdf(`#set document(title: "t")\nHello`, {
          ...OPTIONS,
          pdfStandard: "ua-1",
        }),
      );
      expect(new TextDecoder("latin1").decode(pdf)).toContain("pdfuaid");
    },
  );
});
