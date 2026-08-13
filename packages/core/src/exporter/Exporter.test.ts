import { describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../blocks/BlockNoteSchema.js";
import { COLORS_DEFAULT } from "../editor/defaultColors.js";
import { StyledText } from "../schema/index.js";
import { Exporter } from "./Exporter.js";

// A minimal concrete exporter with empty mappings, to exercise the
// missing-mapping errors thrown when a document contains block types the
// mappings don't cover (e.g. blocks from separate packages, like math,
// without their exporter mappings spread in).
class TestExporter extends Exporter<any, any, any, void, void, void, void> {
  constructor() {
    super(
      BlockNoteSchema.create(),
      { blockMapping: {}, inlineContentMapping: {}, styleMapping: {} } as any,
      { colors: COLORS_DEFAULT },
    );
  }

  public transformStyledText(_styledText: StyledText<any>) {
    return undefined;
  }
}

describe("Exporter missing mappings", () => {
  it("throws a descriptive error for an unmapped block type", async () => {
    await expect(
      new TestExporter().mapBlock({ type: "math" } as any, 0, 0),
    ).rejects.toThrow(
      'missing a block mapping for block type "math". If this block comes from a separate package, spread that package\'s exporter mappings',
    );
  });

  it("throws a descriptive error for an unmapped inline content type", () => {
    expect(() =>
      new TestExporter().mapInlineContent({ type: "inlineMath" } as any),
    ).toThrow(
      'missing an inline content mapping for inline content type "inlineMath"',
    );
  });

  it("throws a descriptive error for an unmapped style", () => {
    expect(() => new TestExporter().mapStyles({ bold: true } as any)).toThrow(
      'missing a style mapping for style "bold"',
    );
  });
});
