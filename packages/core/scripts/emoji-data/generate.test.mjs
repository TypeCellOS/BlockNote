// @vitest-environment node
import { expect, it, vi } from "vite-plus/test";

// Importing the generator must not execute it or load any translation corpora.
import { compactSearchTags } from "./generate.mjs";

it.each(["en", "tr"])(
  "compacts tags with explicit English casing when the default is %s",
  (defaultLocale) => {
    // oxlint-disable-next-line typescript/unbound-method -- Called with an explicit receiver below.
    const lowerCase = String.prototype.toLocaleLowerCase;
    // Model different host defaults without depending on the test runner's ICU.
    const casing = vi
      .spyOn(String.prototype, "toLocaleLowerCase")
      .mockImplementation(function (locale) {
        return lowerCase.call(this, locale ?? defaultLocale);
      });
    try {
      expect(
        compactSearchTags("IRIS", ["iris", "I", "ISLAND", "island"]),
      ).toEqual(["ISLAND"]);
    } finally {
      casing.mockRestore();
    }
  },
);
