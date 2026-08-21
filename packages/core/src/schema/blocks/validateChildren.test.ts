// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { ChildrenConfig } from "./types.js";
import { validateChildrenConfigs } from "./validateChildren.js";

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
  it("accepts the minimal container config", () => {
    expect(validate({ callout: { children: { allow: "any" } } })).not.toThrow();
  });

  it("accepts the columnList shape (restricted children, min 2)", () => {
    expect(
      validate({
        grid: {
          children: { allow: ["gridCell"], min: 2 },
        },
        gridCell: {
          children: { allow: "any" },
          placement: "containerOnly",
        },
      }),
    ).not.toThrow();
  });

  // `allow` carries the whole meaning of a `children` config, so a config
  // without it is rejected rather than silently defaulted (JS consumers don't
  // get the type error TS consumers do).
  it("rejects a config without `allow`", () => {
    expect(
      validate({ callout: { children: {} as unknown as ChildrenConfig } }),
    ).toThrow(/`allow` is required/);
  });

  it("rejects an unknown `allow` form", () => {
    expect(
      validate({
        callout: {
          children: { allow: "everything" } as unknown as ChildrenConfig,
        },
      }),
    ).toThrow(/`allow` must be/);
  });

  it("rejects unknown types in an allow array", () => {
    expect(validate({ grid: { children: { allow: ["nope"] } } })).toThrow(
      /nope/,
    );
  });

  // The bug this design exists to fix: naming a regular block used to compile
  // to "any regular block" and validate as if it had restricted something.
  // Naming a regular type is a hard error until per-type regular-block
  // filtering is actually supported.
  it("rejects a regular block type in an allow array", () => {
    expect(validate({ grid: { children: { allow: ["heading"] } } })).toThrow(
      /not yet supported/,
    );
  });

  it("rejects an allow that permits nothing", () => {
    expect(validate({ grid: { children: { allow: [] } } })).toThrow(
      /permits nothing/,
    );
  });

  it("rejects the containers wildcard when the schema has no other containers", () => {
    expect(validate({ grid: { children: { allow: "containers" } } })).toThrow(
      /no other container block types/,
    );
  });

  it("rejects negative or non-integer minimums", () => {
    expect(
      validate({ callout: { children: { allow: "any", min: -1 } } }),
    ).toThrow(/non-negative integer/);
  });

  it("rejects a maximum smaller than the minimum", () => {
    expect(
      validate({ callout: { children: { allow: "any", min: 3, max: 2 } } }),
    ).toThrow(/greater than or equal/);
  });

  it("rejects a containerOnly block in a wildcard `default`", () => {
    // The wildcards compile to the containers placeable anywhere, so a
    // containerOnly block only fits where it is named explicitly — a default
    // relying on the wildcard would build an unsatisfiable node.
    expect(
      validate({
        box: { children: { allow: "any", default: [{ type: "cell" }] } },
        cell: { children: { allow: "any" }, placement: "containerOnly" },
      }),
    ).toThrow(/not permitted/);
  });

  it("rejects a containerOnly block even when a wildcard container exists", () => {
    // The wildcard never accepts containerOnly blocks, so it must not mask
    // the reachability check.
    expect(
      validate({
        box: { children: { allow: "any" } },
        cell: { children: { allow: "any" }, placement: "containerOnly" },
      }),
    ).toThrow(/could never be inserted/);
  });

  it("rejects the containers wildcard when every other container is containerOnly", () => {
    expect(
      validate({
        box: { children: { allow: "containers" } },
        cell: {
          children: { allow: "any" },
          placement: "containerOnly",
        },
      }),
    ).toThrow(/placeable anywhere/);
  });

  it("rejects an unknown boundary value", () => {
    expect(
      validate({
        cell: {
          children: {
            allow: "any",
            boundary: "shut",
          } as unknown as ChildrenConfig,
        },
      }),
    ).toThrow(/`boundary` must be "open", "isolated" or "sealed"/);
  });

  it("rejects `default` violating the child count", () => {
    expect(
      validate({
        callout: {
          children: { allow: "any", min: 2, default: [{ type: "paragraph" }] },
        },
      }),
    ).toThrow(/fewer than the 2 required/);
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

  it("allows the default placement to be restated on a non-container", () => {
    expect(() =>
      validateChildrenConfigs({
        paragraph: {
          type: "paragraph",
          content: "inline",
          placement: "anywhere",
        },
      }),
    ).not.toThrow();
  });

  it("rejects a containerOnly block no container accepts", () => {
    expect(
      validate({
        grid: {
          children: { allow: ["gridCell"], min: 2 },
        },
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
  });

  // A container may have its own content: it becomes a node holding a content
  // node and a children node.
  it("accepts `children` on a block with inline content", () => {
    expect(() =>
      validateChildrenConfigs({
        toggle: {
          type: "toggle",
          content: "inline",
          children: { allow: "any" },
        },
      }),
    ).not.toThrow();
  });

  it("rejects `children` on a table block", () => {
    expect(() =>
      validateChildrenConfigs({
        bad: { type: "bad", content: "table", children: { allow: "any" } },
      }),
    ).toThrow(/cannot be combined with `content: "table"`/);
  });

  // The content & children nodes are generated from the block type, so a block
  // type that happens to have one of those names would clash with them.
  it("rejects a block type that collides with a generated node name", () => {
    expect(() =>
      validateChildrenConfigs({
        toggle: {
          type: "toggle",
          content: "inline",
          children: { allow: "any" },
        },
        toggle__content: { type: "toggle__content", content: "inline" },
      }),
    ).toThrow(/collides with the block type of the same name/);
  });

  // `fillBefore` recurses across node types, so a cycle blows the stack rather
  // than returning null — it has to be caught before the schema is built.
  it("rejects a container cycle", () => {
    expect(
      validate({
        card: { children: { allow: ["cardBody"] } },
        cardBody: {
          children: { allow: ["card"] },
          placement: "containerOnly",
        },
      }),
    ).toThrow(/requires it back/);
  });

  it("accepts a mutual reference when one side allows regular blocks", () => {
    // A container that accepts regular blocks can always be filled with a
    // paragraph, so it breaks the cycle.
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
