// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { childrenContentExpression } from "./children.js";
import type { ChildrenConfig } from "./types.js";
import { validateChildrenConfigs } from "./validateChildren.js";

// All enforcement happens through the content expression. If this table is
// right, `allow`/`min` are enforced by ProseMirror itself.
const CASES: [string, ChildrenConfig, string][] = [
  [
    "any block or placeable container, at least one (the minimal config)",
    { allow: "blocks" },
    "blockGroupChild+",
  ],
  ["any block, possibly none", { allow: "blocks", min: 0 }, "blockGroupChild*"],
  [
    "any block, two or more",
    { allow: "blocks", min: 2 },
    "blockGroupChild{2,}",
  ],
  ["one container type only", { allow: ["column"], min: 2 }, "column{2,}"],
  [
    "several container types",
    { allow: ["column", "card"] },
    "(column | card)+",
  ],
];

describe("childrenContentExpression", () => {
  it.each(CASES)("%s", (_name, config, expected) => {
    expect(childrenContentExpression(config)).toBe(expected);
  });

  // `validateChildrenConfigs` never builds the content expression — it only
  // resolves `allow`/`min` — so an `allow` that permits nothing is caught
  // here, at expression build, rather than by `validate` below.
  it("throws for an allow array that permits nothing", () => {
    expect(() => childrenContentExpression({ allow: [] })).toThrow(
      /permits nothing/,
    );
  });
});

type ContainerFixture = {
  children: ChildrenConfig;
  content?: "none" | "inline";
  placeable?: "anywhere" | "namedOnly";
};

function configsWith(containers: Record<string, ContainerFixture>) {
  return {
    paragraph: { type: "paragraph", content: "inline" as const },
    heading: { type: "heading", content: "inline" as const },
    ...Object.fromEntries(
      Object.entries(containers).map(
        ([type, { children, content, placeable }]) => [
          type,
          { type, content: content ?? ("none" as const), children, placeable },
        ],
      ),
    ),
  };
}

const validate = (containers: Record<string, ContainerFixture>) => () =>
  validateChildrenConfigs(configsWith(containers));

describe("validateChildrenConfigs", () => {
  it("accepts recursive containers, named-only children, and titled blocks", () => {
    expect(
      validate({ callout: { children: { allow: "blocks" } } }),
    ).not.toThrow();
    expect(
      validate({
        // gridCell is a terminating alternative to the recursive grid.
        grid: { children: { allow: ["gridCell", "grid"], min: 2 } },
        gridCell: { children: { allow: "blocks" }, placeable: "namedOnly" },
        alert: { children: { allow: "blocks" }, content: "inline" },
      }),
    ).not.toThrow();
  });

  it("rejects titled child restrictions the shared blockGroup cannot enforce", () => {
    for (const children of [
      { allow: "blocks", min: 2 },
      { allow: ["cell"] },
    ] as const) {
      expect(
        validate({
          alert: { content: "inline", children },
          cell: { children: { allow: "blocks" } },
        }),
      ).toThrow(/titled blocks support/);
    }
  });

  it("does not treat a titled block's content node as an allowed container", () => {
    expect(
      validate({
        box: { children: { allow: ["alert"] } },
        alert: { content: "inline", children: { allow: "blocks" } },
      }),
    ).toThrow(/regular block/);
  });

  it("rejects named-only placement on a shared regular block wrapper", () => {
    expect(
      validate({
        alert: {
          content: "inline",
          children: { allow: "blocks" },
          placeable: "namedOnly",
        },
      }),
    ).toThrow(/requires a container node/);
  });

  // A config declaring table or plain content would build a node the runtime
  // then throws far from the config for, and the public Block type promises
  // content it never has.
  it("rejects children combined with table or plain content", () => {
    for (const content of ["table", "plain"] as const) {
      expect(() =>
        validateChildrenConfigs({
          box: {
            type: "box",
            content,
            children: { allow: "blocks" },
          },
        }),
      ).toThrow(/either has no content of its own/);
    }
  });

  // Only what nothing else catches. `allow: ["heading"]` compiles to a
  // perfectly valid schema that quietly restricts nothing, since every
  // regular block is the same node. Every other way a `children` config can
  // be wrong is reported by TypeScript at compile time or by ProseMirror with
  // a message of its own.
  it("rejects a regular block type in the allow array", () => {
    expect(validate({ box: { children: { allow: ["heading"] } } })).toThrow(
      /not yet supported/,
    );
  });
});
