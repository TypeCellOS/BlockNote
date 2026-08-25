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

  // Malformed configs, each rejected with a specific message (JS consumers
  // don't get the type errors TS consumers do). `allow: ["heading"]` used to
  // silently compile to "any regular block", so naming a regular block is a
  // hard error until per-type filtering is supported.
  it.each<[string, ContainerFixture["children"], RegExp]>([
    ["missing `allow`", {} as unknown as ChildrenConfig, /`allow` is required/],
    [
      "unknown `allow` form",
      { allow: "everything" } as unknown as ChildrenConfig,
      /`allow` must be/,
    ],
    ["unknown type in allow array", { allow: ["nope"] }, /nope/],
    [
      "regular block type in allow array",
      { allow: ["heading"] },
      /not yet supported/,
    ],
    ["allow that permits nothing", { allow: [] }, /permits nothing/],
    [
      "containers wildcard with no other containers",
      { allow: "containers" },
      /no other container block types/,
    ],
    ["negative minimum", { allow: "any", min: -1 }, /non-negative integer/],
    [
      "maximum smaller than minimum",
      { allow: "any", min: 3, max: 2 },
      /greater than or equal/,
    ],
    [
      "unknown boundary value",
      { allow: "any", boundary: "shut" } as unknown as ChildrenConfig,
      /`boundary` must be "open", "isolated" or "sealed"/,
    ],
    [
      "`default` violating the child count",
      { allow: "any", min: 2, default: [{ type: "paragraph" }] },
      /fewer than the 2 required/,
    ],
  ])("rejects %s", (_name, children, message) => {
    expect(validate({ box: { children } })).toThrow(message);
  });

  it("rejects `default` containing a block that isn't permitted", () => {
    expect(
      validate({
        grid: {
          children: {
            allow: ["gridCell"],
            min: 2,
            default: [{ type: "paragraph" }, { type: "paragraph" }],
          },
        },
        gridCell: {
          children: { allow: "any" },
          placement: "containerOnly",
        },
      }),
    ).toThrow(/not permitted/);
  });

  // The wildcards compile to the containers placeable anywhere, so a
  // containerOnly block only fits where a parent names it explicitly. Every
  // configuration that would leave one unreachable, or in an unsatisfiable
  // `default`, is rejected up front.
  it("rejects containerOnly blocks that nothing can hold", () => {
    // In a wildcard `default`, which would build an unsatisfiable node:
    expect(
      validate({
        box: { children: { allow: "any", default: [{ type: "cell" }] } },
        cell: { children: { allow: "any" }, placement: "containerOnly" },
      }),
    ).toThrow(/not permitted/);
    // Unreachable, even though a wildcard container exists:
    expect(
      validate({
        box: { children: { allow: "any" } },
        cell: { children: { allow: "any" }, placement: "containerOnly" },
      }),
    ).toThrow(/could never be inserted/);
    // Unreachable, because no container's allow list names it:
    expect(
      validate({
        grid: { children: { allow: ["gridCell"], min: 2 } },
        gridCell: {
          children: { allow: "blocks" },
          placement: "containerOnly",
        },
        orphan: {
          children: { allow: "blocks" },
          placement: "containerOnly",
        },
      }),
    ).toThrow(/could never be inserted/);
    // A `containers` wildcard needs at least one placeable-anywhere one:
    expect(
      validate({
        box: { children: { allow: "containers" } },
        cell: { children: { allow: "any" }, placement: "containerOnly" },
      }),
    ).toThrow(/placeable anywhere/);
  });

  it("rejects placement on a block that isn't a container", () => {
    expect(() =>
      validateChildrenConfigs({
        paragraph: {
          type: "paragraph",
          content: "inline",
          placement: "containerOnly",
        },
      }),
    ).toThrow(/only applies to container blocks/);
  });

  // A container block's body is its children; combining `children` with any
  // content of the block's own is not supported.
  it.each(["inline", "plain", "table"] as const)(
    'rejects `children` combined with `content: "%s"`',
    (content) => {
      expect(() =>
        validateChildrenConfigs({
          bad: { type: "bad", content, children: { allow: "any" } },
        }),
      ).toThrow(/`children` can only be combined with `content: "none"`/);
    },
  );

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
