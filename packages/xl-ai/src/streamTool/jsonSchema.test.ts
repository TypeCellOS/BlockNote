import type { JSONSchema7Definition } from "json-schema";
import { describe, expect, it } from "vite-plus/test";

import { createStreamToolsArraySchema } from "./jsonSchema.js";
import type { StreamTool } from "./streamTool.js";

function tool(
  name: string,
  definitions: Record<string, JSONSchema7Definition>,
): StreamTool<{ type: string }> {
  return {
    name,
    inputSchema: { type: "object", $defs: definitions },
    validate: () => ({ ok: true, value: { type: name } }),
    executor: () => ({ execute: async () => false }),
  };
}

describe("createStreamToolsArraySchema definitions", () => {
  it("shares equal nested definitions regardless of object key order", () => {
    const first: JSONSchema7Definition = {
      type: "object",
      properties: {
        value: { type: "string", enum: ["one", "two"] },
        constructor: { type: "string" } satisfies JSONSchema7Definition,
        enabled: true,
        forbidden: false,
      },
      required: ["value"],
    };
    const second: JSONSchema7Definition = {
      required: ["value"],
      properties: {
        forbidden: false,
        constructor: { type: "string" } satisfies JSONSchema7Definition,
        enabled: true,
        value: { enum: ["one", "two"], type: "string" },
      },
      type: "object",
    };
    expect(
      createStreamToolsArraySchema([
        tool("add", { shared: first }),
        tool("update", { shared: second }),
      ]).$defs,
    ).toEqual({ shared: second });
  });

  it.each([
    { type: "number" },
    { type: "string", enum: ["two", "one"] },
    { type: "string", enum: ["one", "two", "three"] },
    false,
  ] satisfies JSONSchema7Definition[])(
    "rejects a different definition: %j",
    (conflicting) => {
      expect(() =>
        createStreamToolsArraySchema([
          tool("add", { shared: { type: "string", enum: ["one", "two"] } }),
          tool("update", { shared: conflicting }),
        ]),
      ).toThrow("Duplicate, but different definition for shared");
    },
  );

  it("retains independent definitions and omits empty definitions", () => {
    expect(
      createStreamToolsArraySchema([
        tool("add", { first: { type: "string" } }),
        tool("update", { second: { type: "number" } }),
      ]).$defs,
    ).toEqual({ first: { type: "string" }, second: { type: "number" } });
    expect(
      createStreamToolsArraySchema([tool("add", {})]).$defs,
    ).toBeUndefined();
  });
});
