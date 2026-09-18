import { describe, expect, it } from "vite-plus/test";
import {
  BlockNoteSchema,
  BlockSchema,
  COLORS_DEFAULT,
  createBlockSpec,
  createInlineContentSpec,
  createStyleSpec,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
  InlineContentSchema,
  StyledText,
  StyleSchema,
} from "../index.js";
import { Exporter } from "./Exporter.js";
import { BlockMapping, InlineContentMapping, StyleMapping } from "./mapping.js";

/**
 * Type-level tests for the base `Exporter`: the constructor's `mappings`
 * argument must cover every block / inline-content / style type in the schema.
 * This enforcement lives entirely in the generic base class, so the tests live
 * here rather than being duplicated in each concrete exporter.
 *
 * A minimal concrete exporter with `string` result types exercises the typing;
 * the tests pass as long as the file type-checks (the `@ts-expect-error`
 * directives assert that the omissions are compile errors).
 */
class TestExporter<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> extends Exporter<B, I, S, string, string, string, string> {
  public constructor(
    schema: BlockNoteSchema<B, I, S>,
    // NoInfer so B/I/S come from the schema only (matching the real exporters);
    // the mappings are then type-checked against it.
    mappings: Exporter<
      NoInfer<B>,
      NoInfer<I>,
      NoInfer<S>,
      string,
      string,
      string,
      string
    >["mappings"],
  ) {
    super(schema, mappings, { colors: COLORS_DEFAULT });
  }

  public transformStyledText(_styledText: StyledText<S>): string {
    return "";
  }
}

// Mappings covering the default schema, used as the baseline. These tests are
// purely type-level (nothing is ever invoked), so only the declared types
// matter - plain casts, no runtime construction.
const defaultSchema = BlockNoteSchema.create();
const blockMapping = {} as BlockMapping<
  typeof defaultSchema.blockSchema,
  typeof defaultSchema.inlineContentSchema,
  typeof defaultSchema.styleSchema,
  string,
  string
>;
const inlineContentMapping = {} as InlineContentMapping<
  typeof defaultSchema.inlineContentSchema,
  typeof defaultSchema.styleSchema,
  string,
  string
>;
const styleMapping = {} as StyleMapping<
  typeof defaultSchema.styleSchema,
  string
>;
const defaultMappings = { blockMapping, inlineContentMapping, styleMapping };

describe("Exporter mapping typing", () => {
  it("typescript: a schema with an extra block requires a mapping for it", () => {
    const schema = BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        extraBlock: createBlockSpec(
          { content: "none", type: "extraBlock", propSchema: {} },
          {} as any,
        )(),
      },
    });

    // @ts-expect-error - extraBlock has no mapping
    new TestExporter(schema, defaultMappings);
  });

  it("typescript: a schema with extra inline content requires a mapping for it", () => {
    const schema = BlockNoteSchema.create({
      inlineContentSpecs: {
        ...defaultInlineContentSpecs,
        extraInlineContent: createInlineContentSpec(
          { type: "extraInlineContent", content: "styled", propSchema: {} },
          {} as any,
        ),
      },
    });

    // @ts-expect-error - extraInlineContent has no mapping
    new TestExporter(schema, defaultMappings);
  });

  it("typescript: a schema with an extra style requires a mapping for it", () => {
    const schema = BlockNoteSchema.create({
      styleSpecs: {
        ...defaultStyleSpecs,
        extraStyle: createStyleSpec(
          { type: "extraStyle", propSchema: "boolean" },
          {} as any,
        ),
      },
    });

    // @ts-expect-error - extraStyle has no mapping
    new TestExporter(schema, defaultMappings);
  });

  it("typescript: a mapping covering more block types than the schema is allowed", () => {
    // Only a subset of the default blocks; the default mappings are a superset.
    const schema = BlockNoteSchema.create({
      blockSpecs: { paragraph: defaultBlockSpecs.paragraph },
    });

    // no error — extra mappings are fine
    new TestExporter(schema, defaultMappings);
  });
});

// A minimal concrete exporter with empty mappings, to exercise the
// missing-mapping errors thrown when a document contains block types the
// mappings don't cover (e.g. blocks from separate packages, like math,
// without their exporter mappings spread in).
class EmptyMappingsExporter extends Exporter<
  any,
  any,
  any,
  void,
  void,
  void,
  void
> {
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
      new EmptyMappingsExporter().mapBlock({ type: "math" } as any, 0, 0),
    ).rejects.toThrow(
      'missing a block mapping for block type "math". If this block comes from a separate package, spread that package\'s exporter mappings',
    );
  });

  it("throws a descriptive error for an unmapped inline content type", () => {
    expect(() =>
      new EmptyMappingsExporter().mapInlineContent({
        type: "inlineMath",
      } as any),
    ).toThrow(
      'missing an inline content mapping for inline content type "inlineMath"',
    );
  });

  it("throws a descriptive error for an unmapped style", () => {
    expect(() =>
      new EmptyMappingsExporter().mapStyles({ bold: true } as any),
    ).toThrow('missing a style mapping for style "bold"');
  });
});
