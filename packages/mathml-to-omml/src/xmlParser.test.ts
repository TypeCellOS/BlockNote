import { describe, expect, it } from "vite-plus/test";

import { parseXml, XmlParseError } from "./xmlParser.js";

describe("parseXml", () => {
  it("parses elements, attributes, and text", () => {
    const root = parseXml('<math display="block"><mi>x</mi></math>');
    expect(root.name).toBe("math");
    expect(root.attributes).toEqual({ display: "block" });
    expect(root.children).toEqual([
      {
        type: "element",
        name: "mi",
        attributes: {},
        children: [{ type: "text", value: "x" }],
      },
    ]);
  });

  it("parses self-closing elements and single-quoted attributes", () => {
    const root = parseXml("<math><mspace width='1em'/></math>");
    expect(root.children).toEqual([
      {
        type: "element",
        name: "mspace",
        attributes: { width: "1em" },
        children: [],
      },
    ]);
  });

  it("decodes entities", () => {
    const root = parseXml(
      '<math alttext="a&amp;b"><mo>&lt;&gt;&quot;&apos;&#x2211;&#8721;</mo></math>',
    );
    expect(root.attributes.alttext).toBe("a&b");
    expect(root.children[0]).toMatchObject({
      children: [{ type: "text", value: "<>\"'∑∑" }],
    });
  });

  it("skips the XML declaration, doctypes, and comments", () => {
    const root = parseXml(
      '<?xml version="1.0"?><!DOCTYPE math><math><!-- comment --><mi>x</mi></math>',
    );
    expect(root.children).toHaveLength(1);
  });

  it("decodes common HTML entities", () => {
    const root = parseXml("<math><mtext>&nbsp;</mtext></math>");
    expect(root.children[0]).toMatchObject({
      children: [{ type: "text", value: " " }],
    });
  });

  it("keeps unknown entities as literal text", () => {
    const root = parseXml("<math><mi>&unknown;</mi></math>");
    expect(root.children[0]).toMatchObject({
      children: [{ type: "text", value: "&unknown;" }],
    });
  });

  it("strips namespace prefixes", () => {
    const root = parseXml(
      '<mml:math xmlns:mml="http://www.w3.org/1998/Math/MathML"><mml:mi>x</mml:mi></mml:math>',
    );
    expect(root.name).toBe("math");
    expect(root.children[0]).toMatchObject({ name: "mi" });
  });

  it("rejects malformed input", () => {
    expect(() => parseXml("no xml here")).toThrow(XmlParseError);
    expect(() => parseXml("<math><mi>x</mi>")).toThrow(XmlParseError);
    expect(() => parseXml("<math></mrow>")).toThrow(XmlParseError);
    expect(() => parseXml("<math></math><math></math>")).toThrow(XmlParseError);
  });
});
