import { columnBlockSchema } from "@shared/testDocument.js";
import { describe, expect, it } from "vite-plus/test";

import { ColumnBlock, ColumnListBlock } from "../blocks/Columns/index.js";

// `shared` can't depend on this package (it dev-depends on `shared` - a
// workspace build cycle), so its test document hand-declares the column
// block schema entries. This guard lives here, next to the real specs, and
// fails loudly if they ever drift apart - update `columnBlockSchema` in
// shared/testDocument.ts to match.
describe("shared test document column schema", () => {
  it("matches the real ColumnBlock / ColumnListBlock configs", () => {
    expect(columnBlockSchema.column).toEqual({
      type: ColumnBlock.config.type,
      content: ColumnBlock.config.content,
      propSchema: ColumnBlock.config.propSchema,
    });
    expect(columnBlockSchema.columnList).toEqual({
      type: ColumnListBlock.config.type,
      content: ColumnListBlock.config.content,
      propSchema: ColumnListBlock.config.propSchema,
    });
  });
});
