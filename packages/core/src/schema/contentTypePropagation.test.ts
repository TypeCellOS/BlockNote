import { describe, expect, it } from "vite-plus/test";

import { createBlockSpec } from "./blocks/createSpec.js";
import type {
  BlockConfig,
  BlockFromConfig,
  PartialBlockFromConfig,
} from "./blocks/types.js";
import { createInlineContentSpec } from "./inlineContent/createSpec.js";
import type {
  CustomInlineContentFromConfig,
  PartialCustomInlineContentFromConfig,
} from "./inlineContent/types.js";
import type { StyleSchema } from "./styles/types.js";

/**
 * Type-level tests asserting that a block's / inline content's `content` field
 * is inferred correctly from its config's `content` discriminant — in
 * particular that the `"plain"` content type propagates to `string`, the same
 * way `"inline"`/`"styled"` propagate to arrays and `"none"` to `undefined`.
 *
 * The assertions are the type annotations and `@ts-expect-error` directives: if
 * propagation breaks, this file stops compiling, which `vp lint` / `tsgo`
 * catches in CI (note that `vp test`, which strips types via esbuild, does not
 * — these tests are guarded by the type-checker, not the runner). The `it`
 * bodies otherwise contain no meaningful runtime logic, mirroring the existing
 * typing tests in `updateBlock.test.ts`.
 */

// Exact type-equality check: resolves to `true` only when X and Y are identical.
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

describe("block content type propagation", () => {
  type PlainContent = BlockFromConfig<
    BlockConfig<"plainBlock", {}, "plain">,
    any,
    any
  >["content"];
  type NoneContent = BlockFromConfig<
    BlockConfig<"noneBlock", {}, "none">,
    any,
    any
  >["content"];
  type InlineContent = BlockFromConfig<
    BlockConfig<"inlineBlock", {}, "inline">,
    any,
    any
  >["content"];

  it("'plain' content is a string", () => {
    const isString: Equal<PlainContent, string> = true;
    expect(isString).toBe(true);

    // @ts-expect-error 'plain' content is a string, not an inline-content array
    const bad: PlainContent = [{ type: "text", text: "x", styles: {} }];
    void bad;
  });

  it("'none' content is undefined", () => {
    const isUndefined: Equal<NoneContent, undefined> = true;
    expect(isUndefined).toBe(true);
  });

  it("'inline' content is distinct from 'plain' (an array, not a string)", () => {
    // @ts-expect-error 'inline' content is an array, not a string
    const bad: InlineContent = "hello";
    void bad;
  });
});

describe("partial block content type propagation", () => {
  type PartialPlainContent = PartialBlockFromConfig<
    BlockConfig<"plainBlock", {}, "plain">,
    any,
    any
  >["content"];

  it("'plain' partial content is an optional string", () => {
    const isOptionalString: Equal<PartialPlainContent, string | undefined> =
      true;
    expect(isOptionalString).toBe(true);

    // @ts-expect-error 'plain' content is a string, not an inline-content array
    const bad: PartialPlainContent = [{ type: "text", text: "x", styles: {} }];
    void bad;
  });
});

describe("inline content type propagation", () => {
  type PlainContent = CustomInlineContentFromConfig<
    { type: "plainIC"; content: "plain"; readonly propSchema: {} },
    StyleSchema
  >["content"];
  type NoneContent = CustomInlineContentFromConfig<
    { type: "noneIC"; content: "none"; readonly propSchema: {} },
    StyleSchema
  >["content"];
  type StyledContent = CustomInlineContentFromConfig<
    { type: "styledIC"; content: "styled"; readonly propSchema: {} },
    StyleSchema
  >["content"];

  it("'plain' inline content is a string", () => {
    const isString: Equal<PlainContent, string> = true;
    expect(isString).toBe(true);

    // @ts-expect-error 'plain' inline content is a string, not a StyledText array
    const bad: PlainContent = [];
    void bad;
  });

  it("'none' inline content is undefined", () => {
    const isUndefined: Equal<NoneContent, undefined> = true;
    expect(isUndefined).toBe(true);
  });

  it("'styled' inline content is distinct from 'plain' (an array, not a string)", () => {
    // @ts-expect-error 'styled' inline content is a StyledText array, not a string
    const bad: StyledContent = "hello";
    void bad;
  });
});

describe("partial inline content type propagation", () => {
  type PartialPlainContent = PartialCustomInlineContentFromConfig<
    { type: "plainIC"; content: "plain"; readonly propSchema: {} },
    StyleSchema
  >["content"];

  it("'plain' partial inline content is an optional string", () => {
    const isOptionalString: Equal<PartialPlainContent, string | undefined> =
      true;
    expect(isOptionalString).toBe(true);
  });
});

describe("content type propagation through the spec factories", () => {
  it("createBlockSpec propagates 'plain' to the block's content type", () => {
    const plainBlock = createBlockSpec(
      { type: "plainBlock", propSchema: {}, content: "plain" },
      { render: () => ({ dom: undefined as unknown as HTMLElement }) },
    );

    type Content = BlockFromConfig<
      ReturnType<typeof plainBlock>["config"],
      any,
      any
    >["content"];

    const isString: Equal<Content, string> = true;
    expect(isString).toBe(true);
  });

  it("createInlineContentSpec propagates 'plain' to the inline content's content type", () => {
    const plainIC = createInlineContentSpec(
      { type: "plainIC", propSchema: {}, content: "plain" },
      { render: () => ({ dom: undefined as unknown as HTMLElement }) },
    );

    type Content = CustomInlineContentFromConfig<
      (typeof plainIC)["config"],
      StyleSchema
    >["content"];

    const isString: Equal<Content, string> = true;
    expect(isString).toBe(true);
  });
});
