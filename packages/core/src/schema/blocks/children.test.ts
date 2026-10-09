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
  it("accepts any blocks when `children` or `allow` is left out", () => {
    expect(childrenContentExpression()).toBe("blockGroupChild+");
    expect(childrenContentExpression({ min: 2 })).toBe("blockGroupChild{2,}");
  });

  it("throws for an allow array that permits nothing", () => {
    expect(() => childrenContentExpression({ allow: [] })).toThrow(
      /permits nothing/,
    );
  });
});

type BlockFixture = {
  content?: "none" | "inline" | "plain" | "table";
  container?: true;
  children?: ChildrenConfig;
  placeable?: "anywhere" | "namedOnly";
};

function specsWith(blocks: Record<string, BlockFixture>) {
  return {
    paragraph: { config: { content: "inline" as const } },
    heading: { config: { content: "inline" as const } },
    ...Object.fromEntries(
      Object.entries(blocks).map(([type, config]) => [
        type,
        { config: { ...config, content: config.content ?? ("none" as const) } },
      ]),
    ),
  };
}

// Typed loosely on purpose: the validator is what catches the combinations the
// types reject, for JS callers.
const validate = (blocks: Record<string, BlockFixture>) => () =>
  validateChildrenConfigs(specsWith(blocks) as any);

describe("validateChildrenConfigs", () => {
  it("accepts recursive containers and named-only children", () => {
    expect(validate({ callout: { container: true } })).not.toThrow();
    expect(
      validate({
        // gridCell is a terminating alternative to the recursive grid.
        grid: {
          container: true,
          children: { allow: ["gridCell", "grid"], min: 2 },
        },
        gridCell: { container: true, placeable: "namedOnly" },
      }),
    ).not.toThrow();
  });

  it.each(["inline", "plain", "table"] as const)(
    "rejects `container` on a block with %s content",
    (content) => {
      expect(validate({ alert: { content, container: true } })).toThrow(
        /only for blocks without content/,
      );
    },
  );

  // Any block can have any child blocks, so writing out the default is fine
  // everywhere. Restricting them needs the block's own node.
  it.each(["inline", "plain", "table", "none"] as const)(
    "only accepts the default children on a %s block that isn't a container",
    (content) => {
      expect(
        validate({ alert: { content, children: { allow: "blocks" } } }),
      ).not.toThrow();
      for (const children of [
        { allow: "blocks", min: 2 },
        { allow: ["cell"] },
      ] as const) {
        expect(
          validate({
            alert: { content, children },
            cell: { container: true },
          }),
        ).toThrow(/requires `container: true`/);
      }
    },
  );

  it("does not treat a block with content as an allowed container", () => {
    expect(
      validate({
        box: { container: true, children: { allow: ["alert"] } },
        alert: { content: "inline" },
      }),
    ).toThrow(/regular block/);
  });

  it("rejects named-only placement on a shared regular block wrapper", () => {
    expect(
      validate({ alert: { content: "inline", placeable: "namedOnly" } }),
    ).toThrow(/requires a container node/);
  });

  it.each(["typo", "blockGroupChild", "toString"])(
    "rejects an allow entry that is not a configured block: %s",
    (allowed) => {
      expect(
        validate({ box: { container: true, children: { allow: [allowed] } } }),
      ).toThrow(/not a configured block type/);
    },
  );

  it("rejects a regular block type in the allow array", () => {
    expect(
      validate({ box: { container: true, children: { allow: ["heading"] } } }),
    ).toThrow(/not yet supported/);
  });
});
