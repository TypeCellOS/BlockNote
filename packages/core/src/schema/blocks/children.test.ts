// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { childrenContentExpression, resolveChildren } from "./children.js";
import type { ChildrenConfig } from "./types.js";

// The content expression is the whole enforcement story — if this table is
// right, `allow`/`min`/`max` are enforced by ProseMirror itself.
const CASES: [string, ChildrenConfig, string][] = [
  [
    "any block, at least one (the minimal config)",
    { allow: "any" },
    "blockGroupChild+",
  ],
  ["any block, possibly none", { allow: "any", min: 0 }, "blockGroupChild*"],
  [
    "any block, exactly one",
    { allow: "any", min: 1, max: 1 },
    "blockGroupChild",
  ],
  ["any block, two or more", { allow: "any", min: 2 }, "blockGroupChild{2,}"],
  [
    "any block, two to four",
    { allow: "any", min: 2, max: 4 },
    "blockGroupChild{2,4}",
  ],
  [
    "any block, at most one",
    { allow: "any", min: 0, max: 1 },
    "blockGroupChild?",
  ],
  [
    "any block, exactly three",
    { allow: "any", min: 3, max: 3 },
    "blockGroupChild{3}",
  ],
  ["regular blocks only", { allow: "blocks" }, "blockContainer+"],
  ["one container type only", { allow: ["column"], min: 2 }, "column{2,}"],
  [
    "several container types",
    { allow: ["column", "card"] },
    "(column | card)+",
  ],
  [
    "any container but no regular blocks",
    { allow: "containers" },
    "anyContainer+",
  ],
];

describe("childrenContentExpression", () => {
  it.each(CASES)("%s", (_name, config, expected) => {
    expect(childrenContentExpression(config)).toBe(expected);
  });
});

describe("resolveChildren", () => {
  // The four `allow` forms and what they desugar to. The compiled expressions
  // above are a direct function of this table.
  it.each([
    ["any", { blocks: true, containers: true }],
    ["blocks", { blocks: true, containers: [] }],
    ["containers", { blocks: false, containers: true }],
    [["column"], { blocks: false, containers: ["column"] }],
  ] as const)("resolves allow %j", (allow, expected) => {
    expect(resolveChildren({ allow })).toMatchObject(expected);
  });

  it("defaults `min` to 1 and `max` to unbounded", () => {
    const resolved = resolveChildren({ allow: "any" });
    expect(resolved.min).toBe(1);
    expect(resolved.max).toBeUndefined();
  });

  it("returns the same object for the same config", () => {
    // Downstream code resolves the same config object on every node build and
    // repair pass, and must never mutate the user's object.
    const config: ChildrenConfig = { allow: "any", min: 1 };
    expect(resolveChildren(config)).toBe(resolveChildren(config));
    expect(config).toEqual({ allow: "any", min: 1 });
  });

  it("defaults `whenEmptied` to refill", () => {
    expect(resolveChildren({ allow: "any" }).whenEmptied).toBe("refill");
    expect(
      resolveChildren({ allow: "any", whenEmptied: "unwrap" }).whenEmptied,
    ).toBe("unwrap");
  });

  it("defaults the boundary to isolated", () => {
    expect(resolveChildren({ allow: "any" }).boundary).toBe("isolated");
    expect(resolveChildren({ allow: "any", boundary: "open" }).boundary).toBe(
      "open",
    );
    expect(resolveChildren({ allow: "any", boundary: "sealed" }).boundary).toBe(
      "sealed",
    );
  });
});
