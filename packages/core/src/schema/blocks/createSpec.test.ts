import { Node as TiptapNode } from "@tiptap/core";
import { describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { createBlockSpec } from "./createSpec.js";
import { createBlockSpecFromTiptapNode } from "./internal.js";

describe("block spec and node agreement", () => {
  it("leaves a hand-written node's content expression authoritative", () => {
    expect(() =>
      BlockNoteSchema.create().extend({
        blockSpecs: {
          holder: createBlockSpecFromTiptapNode(
            {
              node: TiptapNode.create({
                name: "holder",
                group: "blockContent",
                content: "paragraph+",
              }),
              type: "holder",
              content: "none",
            },
            {},
          ),
        },
      }),
    ).not.toThrow();
  });

  it("rejects a hand-written node whose name contradicts its config", () => {
    expect(() =>
      BlockNoteSchema.create().extend({
        blockSpecs: {
          holder: createBlockSpecFromTiptapNode(
            {
              node: TiptapNode.create({
                name: "notHolder",
                group: "block",
                content: "block+",
              }),
              type: "holder",
              content: "none",
            },
            {},
          ),
        },
      }),
    ).toThrow(/Node name does not match block type/);
  });
});

describe("render hooks contract", () => {
  function unexpectedRender(): never {
    throw new Error(
      "Invalid render hook configuration must fail before rendering",
    );
  }

  it("rejects a block declaring neither render nor renderFrame", () => {
    expect(() =>
      createBlockSpec(
        { type: "probed", propSchema: {}, content: "none", layoutOnly: true },
        {},
      )(),
    ).toThrow(/must declare `renderFrame`/);
  });

  it("rejects renderFrame alone on a block that is not a layout block", () => {
    expect(() =>
      createBlockSpec(
        { type: "probed", propSchema: {}, content: "inline" },
        { renderFrame: unexpectedRender },
      )(),
    ).toThrow(/must declare `render`/);
  });

  it("rejects render on a layout block, which has no content to draw", () => {
    expect(() =>
      createBlockSpec(
        { type: "probed", propSchema: {}, content: "none", layoutOnly: true },
        { render: unexpectedRender, renderFrame: unexpectedRender },
      )(),
    ).toThrow(/has no content for `render` to draw/);
  });
});
