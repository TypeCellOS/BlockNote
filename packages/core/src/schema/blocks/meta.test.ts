import { describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { createBlockSpec } from "./createSpec.js";
import { resolveBlockMeta } from "./meta.js";

describe("resolveBlockMeta", () => {
  it("fills in the defaults of a regular block", () => {
    expect(resolveBlockMeta(undefined, {})).toEqual({
      selectable: true,
      code: false,
      defining: true,
      isolating: true,
      draggable: true,
      listItem: false,
    });
  });

  it("keeps what the block declares", () => {
    const highlight = () => "latex";
    expect(
      resolveBlockMeta(
        { selectable: false, code: true, isolating: false, highlight },
        {},
      ),
    ).toEqual({
      selectable: false,
      code: true,
      defining: true,
      isolating: false,
      draggable: true,
      listItem: false,
      highlight,
    });
  });

  it("decides a layout block's node flags itself", () => {
    expect(
      resolveBlockMeta(
        { code: true, defining: false, isolating: true },
        { layoutOnly: true },
      ),
    ).toMatchObject({ code: false, defining: true, isolating: false });
  });

  it("gives a named-only layout block no drag handle unless it opts in", () => {
    const namedOnly = { layoutOnly: true, placeable: "namedOnly" } as const;
    expect(resolveBlockMeta(undefined, namedOnly).draggable).toBe(false);
    expect(resolveBlockMeta({ draggable: true }, namedOnly).draggable).toBe(
      true,
    );
    expect(
      resolveBlockMeta(undefined, { layoutOnly: true, placeable: "anywhere" })
        .draggable,
    ).toBe(true);
  });
});

describe("list item metadata", () => {
  it("defaults to non-list while preserving explicit opt-ins and opt-outs", () => {
    expect(resolveBlockMeta(undefined, {}).listItem).toBe(false);
    expect(resolveBlockMeta({ listItem: true }, {}).listItem).toBe(true);
    expect(resolveBlockMeta({ listItem: false }, {}).listItem).toBe(false);
  });

  it.each([
    "bulletListItem",
    "numberedListItem",
    "checkListItem",
    "toggleListItem",
  ] as const)("opts the built-in %s into list semantics", (type) => {
    const schema = BlockNoteSchema.create();
    expect(schema.blockSpecs[type].implementation.meta.listItem).toBe(true);
  });

  it("does not opt other built-in blocks into list semantics", () => {
    const schema = BlockNoteSchema.create();
    for (const [type, spec] of Object.entries(schema.blockSpecs)) {
      if (
        ![
          "bulletListItem",
          "numberedListItem",
          "checkListItem",
          "toggleListItem",
        ].includes(type)
      ) {
        expect(spec.implementation.meta.listItem, type).toBe(false);
      }
    }
  });

  it("lets a regular custom block opt in without a numbered-list block", () => {
    const customListItem = createBlockSpec(
      { type: "customListItem", propSchema: {}, content: "inline" },
      {
        meta: { listItem: true },
        render() {
          throw new Error("Metadata tests must not render a block");
        },
      },
    )();
    const custom = createBlockSpec(
      { type: "custom", propSchema: {}, content: "inline" },
      {
        render() {
          throw new Error("Metadata tests must not render a block");
        },
      },
    )();
    const schema = BlockNoteSchema.create({
      blockSpecs: { customListItem, custom },
    });

    expect(schema.blockSpecs.custom.implementation.meta.listItem).toBe(false);
    expect(Object.keys(schema.blockSpecs)).toEqual([
      "customListItem",
      "custom",
    ]);
    expect(schema.blockSpecs.customListItem.implementation.meta.listItem).toBe(
      true,
    );
  });
});
