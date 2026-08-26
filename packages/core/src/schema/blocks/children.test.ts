// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { childrenContentExpression, resolveChildren } from "./children.js";
import type { ChildrenConfig } from "./types.js";
import { validateChildrenConfigs } from "./validateChildren.js";

// All enforcement happens through the content expression. If this table is
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

  it("applies the defaults: min 1, unbounded, refill, isolated", () => {
    const resolved = resolveChildren({ allow: "any" });
    expect(resolved.min).toBe(1);
    expect(resolved.max).toBeUndefined();
    expect(resolved.whenEmptied).toBe("refill");
    expect(resolved.boundary).toBe("isolated");
  });

  it("returns the same object for the same config, without mutating it", () => {
    // Downstream code resolves the same config object on every node build and
    // repair pass, and must never mutate the user's object.
    const config: ChildrenConfig = { allow: "any", min: 1 };
    expect(resolveChildren(config)).toBe(resolveChildren(config));
    expect(config).toEqual({ allow: "any", min: 1 });
  });
});

type ContainerFixture = {
  children: ChildrenConfig;
  placement?: "anywhere" | "containerOnly";
};

function configsWith(containers: Record<string, ContainerFixture>) {
  return {
    paragraph: { type: "paragraph", content: "inline" as const },
    heading: { type: "heading", content: "inline" as const },
    ...Object.fromEntries(
      Object.entries(containers).map(([type, { children, placement }]) => [
        type,
        { type, content: "none" as const, children, placement },
      ]),
    ),
  };
}

const validate = (containers: Record<string, ContainerFixture>) => () =>
  validateChildrenConfigs(configsWith(containers));

describe("validateChildrenConfigs", () => {
  it("accepts valid shapes: minimal and columnList-style", () => {
    expect(validate({ callout: { children: { allow: "any" } } })).not.toThrow();
    expect(
      validate({
        grid: { children: { allow: ["gridCell"], min: 2 } },
        gridCell: { children: { allow: "any" }, placement: "containerOnly" },
      }),
    ).not.toThrow();
  });

  // Only what nothing else catches. ProseMirror parses `{min,max}` without
  // comparing the two, so an inverted range silently becomes "exactly min";
  // and `allow: ["heading"]` compiles to a perfectly valid schema that
  // quietly restricts nothing, since every regular block is the same node.
  // Every other way a `children` config can be wrong is reported by
  // TypeScript at compile time or by ProseMirror with a message of its own.
  it.each<[string, ContainerFixture["children"], RegExp]>([
    [
      "a maximum smaller than the minimum",
      { allow: "any", min: 3, max: 2 },
      /greater than or equal/,
    ],
    [
      "a regular block type in the allow array",
      { allow: ["heading"] },
      /not yet supported/,
    ],
  ])("rejects %s", (_name, children, message) => {
    expect(validate({ box: { children } })).toThrow(message);
  });

  // `fillBefore` recurses across node types, so a cycle blows the stack
  // rather than returning null. It has to be caught before the schema is
  // built. A mutual reference is fine as soon as one side can be filled with
  // a paragraph instead.
  it("rejects a container cycle but accepts a breakable mutual reference", () => {
    expect(
      validate({
        card: { children: { allow: ["cardBody"] } },
        cardBody: {
          children: { allow: ["card"] },
          placement: "containerOnly",
        },
      }),
    ).toThrow(/requires it back/);
    expect(
      validate({
        card: { children: { allow: ["cardBody"] } },
        cardBody: {
          children: { allow: "any" },
          placement: "containerOnly",
        },
      }),
    ).not.toThrow();
  });
});
