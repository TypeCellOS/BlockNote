import { describe, expect, it } from "vitest";
import * as z from "zod/v4/core";
import { createTestEditor } from "../createTestEditor.js";
import { testSchema } from "../testSchema.js";

// Tests for verifying that exporting blocks to other formats works as expected.
// Used for as many cases as possible to ensure each block or set of blocks is
// correctly converted into different formats.
describe("Schema test", () => {
  const getEditor = createTestEditor(testSchema);

  it("Block specs test", async () => {
    const specs = getEditor().schema.blockSpecs;
    Object.values(specs).forEach((spec) => {
      // Use an empty object validation to check if a zod propSchema is the same shape
      // @ts-ignore this is just to check the shape, not that zod instance is a certain shape
      spec.config.propSchema = z.parse(spec.config.propSchema._zodSource, {});
    });
    await expect(specs).toMatchFileSnapshot(`./__snapshots__/blocks.json`);
  });

  it("Inline content specs test", async () => {
    const specs = getEditor().schema.inlineContentSpecs;
    Object.values(specs).forEach((spec) => {
      if (typeof spec.config === "object" && "propSchema" in spec.config) {
        // Use an empty object validation to check if a zod propSchema is the same shape
        // @ts-ignore this is just to check the shape, not that zod instance is a certain shape
        spec.config.propSchema = z.parse(spec.config.propSchema._zodSource, {});
      }
    });
    await expect(specs).toMatchFileSnapshot(
      `./__snapshots__/inlinecontent.json`,
    );
  });

  it("Style specs test", async () => {
    await expect(getEditor().schema.styleSpecs).toMatchFileSnapshot(
      `./__snapshots__/styles.json`,
    );
  });
});
