import { loadFileBuffer, loadFontDataUrl } from "@shared/util/fileUtil.js";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

describe("Vite asset file loading", () => {
  let directory: string;
  const contents = Buffer.from([0, 127, 128, 255]);

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "blocknote-file-url-"));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  for (const prefix of ["", "/@fs"]) {
    it.each(["한글 font.ttf", "font #100% %20.ttf"])(
      `reads encoded ${prefix || "absolute"} asset paths: %s`,
      async (name) => {
        const file = join(directory, name);
        writeFileSync(file, contents);

        const buffer = await loadFileBuffer({
          default: prefix + pathToFileURL(file).pathname,
        });

        expect(buffer).toEqual(contents);
      },
    );
  }

  it("reads an unencoded filesystem path", async () => {
    const file = join(directory, "font.ttf");
    writeFileSync(file, contents);

    expect(await loadFileBuffer({ default: file })).toEqual(contents);
  });

  it("creates a font data URL from an encoded asset path", async () => {
    const file = join(directory, "한글 font.ttf");
    writeFileSync(file, contents);

    expect(
      await loadFontDataUrl({
        default: "/@fs" + pathToFileURL(file).pathname,
      }),
    ).toBe(`data:font/ttf;base64,${contents.toString("base64")}`);
  });
});
