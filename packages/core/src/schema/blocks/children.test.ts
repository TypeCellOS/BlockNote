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
  content?: "none" | "inline" | "plain";
  placeable?: "anywhere" | "namedOnly";
};

function specsWith(containers: Record<string, ContainerFixture>) {
  return {
    paragraph: { config: { content: "inline" as const } },
    heading: { config: { content: "inline" as const } },
    ...Object.fromEntries(
      Object.entries(containers).map(
        ([type, { children, content, placeable }]) => [
          type,
          {
            config: {
              content: content ?? ("none" as const),
              children,
              placeable,
            },
          },
        ],
      ),
    ),
  };
}

const validate = (containers: Record<string, ContainerFixture>) => () =>
  validateChildrenConfigs(specsWith(containers));

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
        source: { children: { allow: "blocks" }, content: "plain" },
      }),
    ).not.toThrow();
  });

  it.each(["inline", "plain"] as const)(
    "rejects %s child restrictions the shared blockGroup cannot enforce",
    (content) => {
      for (const children of [
        { allow: "blocks", min: 2 },
        { allow: ["cell"] },
      ] as const) {
        expect(
          validate({
            alert: { content, children },
            cell: { children: { allow: "blocks" } },
          }),
        ).toThrow(/blocks with inline or plain content support/);
      }
    },
  );

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

  // Tables do not support owned child blocks.
  it("rejects children combined with table content", () => {
    for (const content of ["table"] as const) {
      expect(() =>
        validateChildrenConfigs({
          box: {
            config: { content, children: { allow: "blocks" } },
          },
        }),
      ).toThrow(/not supported on table blocks/);
    }
  });

  it.each(["typo", "blockGroupChild", "toString"])(
    "rejects an allow entry that is not a configured block: %s",
    (allowed) => {
      expect(validate({ box: { children: { allow: [allowed] } } })).toThrow(
        /not a configured block type/,
      );
    },
  );

  it("rejects a regular block type in the allow array", () => {
    expect(validate({ box: { children: { allow: ["heading"] } } })).toThrow(
      /not yet supported/,
    );
  });
});
