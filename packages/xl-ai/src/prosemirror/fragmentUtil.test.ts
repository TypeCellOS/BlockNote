import { Fragment, Schema } from "prosemirror-model";
import { describe, expect, it } from "vitest";
import { getFirstChar } from "./fragmentUtil.js";

describe("fragmentUtil", () => {
  describe("getFirstChar", () => {
    // Create a more complex schema for testing
    const schema = new Schema({
      nodes: {
        doc: { content: "block+" },
        paragraph: { content: "inline*", group: "block" },
        heading: {
          content: "inline*",
          group: "block",
          attrs: { level: { default: 1 } },
        },
        blockcontainer: { content: "block+", group: "block" },
        text: { group: "inline" },
      },
    });

    it("should return 0 for a text fragment", () => {
      const fragment = Fragment.from(schema.text("Hello"));
      expect(getFirstChar(fragment)).toBe(0);
    });

    it("should return correct index for a paragraph with text", () => {
      const paragraph = schema.node("paragraph", null, [schema.text("Hello")]);
      const fragment = Fragment.from(paragraph);
      expect(getFirstChar(fragment)).toBe(1);
    });

    it("should return undefined for an empty fragment", () => {
      const fragment = Fragment.empty;
      expect(getFirstChar(fragment)).toBe(undefined);
    });

    it("should handle nested nodes correctly", () => {
      const paragraph = schema.node("paragraph", null, [
        schema.text("Hello"),
        schema.text(" World"),
      ]);
      const fragment = Fragment.from(paragraph);
      expect(getFirstChar(fragment)).toBe(1);
    });

    it("should handle blockcontainer with nested paragraph", () => {
      const paragraph = schema.node("paragraph", null, [schema.text("Hello")]);
      const blockcontainer = schema.node("blockcontainer", null, [paragraph]);
      const fragment = Fragment.from(blockcontainer);
      // Blockquote opening (1) + paragraph opening (1) = 2
      expect(getFirstChar(fragment)).toBe(2);
    });

    it("should handle heading with text", () => {
      const heading = schema.node("heading", { level: 2 }, [
        schema.text("Title"),
      ]);
      const fragment = Fragment.from(heading);
      expect(getFirstChar(fragment)).toBe(1);
    });

    it("should handle multiple block nodes", () => {
      const paragraph1 = schema.node("paragraph", null, [schema.text("First")]);
      const paragraph2 = schema.node("paragraph", null, [
        schema.text("Second"),
      ]);
      const fragment = Fragment.from([paragraph1, paragraph2]);
      expect(getFirstChar(fragment)).toBe(1);
    });

    it("should handle deeply nested structure", () => {
      const text = schema.text("Deep text");
      const paragraph = schema.node("paragraph", null, [text]);
      const blockcontainer = schema.node("blockcontainer", null, [paragraph]);
      const blockcontainer2 = schema.node("blockcontainer", null, [
        blockcontainer,
      ]);

      const fragment = Fragment.from(blockcontainer2);
      // blockcontainer + blockcontainer + paragraph (1) = 3
      expect(getFirstChar(fragment)).toBe(3);
    });
  });
});
