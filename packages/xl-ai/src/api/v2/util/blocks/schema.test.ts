import {
  BlockNoteEditor,
  BlockNoteSchema,
  createBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { TOP_LEVEL } from "./blockIndex.js";
import { schemaRulesOf } from "./schema.js";

const frame = () => {
  const dom = document.createElement("div");
  return { dom, slot: dom };
};

/** A layout block with a config, as the layout blocks of core and its tests have them. */
function layoutBlock(
  type: string,
  config: {
    children?: {
      allow?: string[];
      exclude?: string[];
      min?: number;
      dissolve?: boolean;
    };
    placeable?: "namedOnly";
  },
) {
  return createBlockSpec(
    { type, propSchema: {}, content: "none", layoutOnly: true, ...config },
    { renderFrame: frame },
  )();
}

// The layout blocks of the core tests (`layoutBlocks.fixture.ts`), and one
// with `exclude`.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    // Any blocks, at least one.
    box: layoutBlock("box", {}),
    // Two or more cells, and only cells.
    grid: layoutBlock("grid", { children: { allow: ["gridCell"], min: 2 } }),
    gridCell: layoutBlock("gridCell", { placeable: "namedOnly" }),
    // A tab set does not dissolve: its tabs are content.
    tabs: layoutBlock("tabs", {
      children: { allow: ["tab"], min: 1, dissolve: false },
    }),
    tab: layoutBlock("tab", { placeable: "namedOnly" }),
    // Any blocks except a box (only a layout block can be excluded).
    panel: layoutBlock("panel", { children: { exclude: ["box"] } }),
  },
});
const rules = schemaRulesOf(
  BlockNoteEditor.create({ schema }).schema.blockSchema,
);

describe("schemaRulesOf", () => {
  it("gives the content kind of a block type, and throws for a type that is not in the schema", () => {
    expect(rules.contentKindOf("paragraph")).toBe("inline");
    expect(rules.contentKindOf("table")).toBe("table");
    expect(rules.contentKindOf("box")).toBe("none");
    expect(() => rules.contentKindOf("unknown")).toThrow(
      'Block type "unknown" is not in the schema',
    );
  });

  it("gives no layout rule for a block that is not a layout block", () => {
    expect(rules.layoutRuleOf("paragraph")).toBeUndefined();
    expect(rules.layoutRuleOf("unknown")).toBeUndefined();
  });

  it("gives the layout rule of each config", () => {
    expect(
      Object.fromEntries(
        ["box", "grid", "gridCell", "tabs", "tab", "panel"].map((type) => [
          type,
          rules.layoutRuleOf(type),
        ]),
      ),
    ).toEqual({
      // Without `children`: at least one child, and it dissolves.
      box: { minChildren: 1, namedOnly: false, dissolves: true },
      grid: { minChildren: 2, namedOnly: false, dissolves: true },
      gridCell: { minChildren: 1, namedOnly: true, dissolves: true },
      // `dissolve: false`.
      tabs: { minChildren: 1, namedOnly: false, dissolves: false },
      tab: { minChildren: 1, namedOnly: true, dissolves: true },
      // `children` without `min`: at least one child.
      panel: { minChildren: 1, namedOnly: false, dissolves: true },
    });
  });

  it("puts a block that is not namedOnly in each parent without an allow list", () => {
    expect(rules.canContain(TOP_LEVEL, "paragraph")).toBe(true);
    expect(rules.canContain(TOP_LEVEL, "grid")).toBe(true);
    expect(rules.canContain("paragraph", "tabs")).toBe(true);
    expect(rules.canContain("box", "paragraph")).toBe(true);
  });

  it("puts a block into a parent with an allow list only if the list names its type", () => {
    expect(rules.canContain("grid", "gridCell")).toBe(true);
    expect(rules.canContain("grid", "paragraph")).toBe(false);
    expect(rules.canContain("tabs", "tab")).toBe(true);
    expect(rules.canContain("tabs", "box")).toBe(false);
  });

  it("puts a namedOnly block only into a parent that names its type", () => {
    expect(rules.canContain(TOP_LEVEL, "tab")).toBe(false);
    expect(rules.canContain("paragraph", "tab")).toBe(false);
    expect(rules.canContain("box", "tab")).toBe(false);
    expect(rules.canContain("grid", "tab")).toBe(false);
  });

  it("does not put a block into a parent that excludes its type", () => {
    expect(rules.canContain("panel", "box")).toBe(false);
    expect(rules.canContain("panel", "grid")).toBe(true);
    expect(rules.canContain("panel", "paragraph")).toBe(true);
    expect(rules.canContain("panel", "gridCell")).toBe(false);
  });
});
