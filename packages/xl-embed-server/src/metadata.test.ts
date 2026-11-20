import { describe, expect, it } from "vite-plus/test";
import { discoverOEmbed, fallbackOEmbed } from "./metadata.js";
import { createHeadCollector } from "./htmlHead.js";

const base = new URL("https://source.test/articles/post");
function parseHead(html: string) {
  const collector = createHeadCollector();
  collector.push(html);
  const result = collector.finish();
  if (result.error) {
    throw new Error("Unexpected complex metadata fixture.");
  }
  return result.value;
}

describe("metadata selection and URL integrity", () => {
  it.each(["https://assets.test/root/", "/"])(
    "uses the first base href %s for links without changing page identity",
    (href) => {
      const expected = new URL(href, base).href;
      const head = parseHead(`<base target="_blank"><base href="${href}">
      <base href="https://ignored.test/"><link rel=alternate type="application/json+oembed" href="oembed">
      <link rel=icon href="icon.png"><meta property=og:image content="image.png">`);
      expect(discoverOEmbed(head, base)?.href).toBe(`${expected}oembed`);
      expect(fallbackOEmbed(head, base)).toMatchObject({
        title: "source.test",
        provider_url: "https://source.test",
        icon_url: `${expected}icon.png`,
        image_url: `${expected}image.png`,
      });
    },
  );

  it.each(["http://[", "javascript:bad", ""])(
    "does not use a later base after first href %j",
    (href) => {
      const head =
        parseHead(`<base href="${href}"><base href="https://ignored.test/">
      <link rel=alternate type="application/json+oembed" href="oembed"><link rel=icon href="icon">`);
      expect(discoverOEmbed(head, base)?.href).toBe(
        "https://source.test/articles/oembed",
      );
      expect(fallbackOEmbed(head, base).icon_url).toBe(
        "https://source.test/articles/icon",
      );
    },
  );

  it.each([
    undefined,
    "",
    "javascript:bad",
    "https://user:secret@other.test/api",
    "http://[",
  ])("continues discovery after an unusable href %j", (href) => {
    const head =
      parseHead(`<link rel=alternate type="application/json+oembed" ${href === undefined ? "" : `href="${href}"`}>
        <link rel=alternate type="application/json+oembed" href="/valid">`);
    expect(discoverOEmbed(head, base)?.href).toBe("https://source.test/valid");
  });

  it("prefers the first nonempty OG value over Twitter/title and normalizes only prose", () => {
    const head = parseHead(`<title>Fallback</title>
      <meta name=twitter:title content=Twitter><meta property=og:title content=" ">
      <meta property=og:title content=" Fish &amp; Chips "><meta property=og:title content=Second>
      <meta property=og:description content="${"a".repeat(3000)}">
      <meta property=og:image content="../photo">`);
    const result = fallbackOEmbed(head, base);
    expect(result.title).toBe("Fish & Chips");
    expect(result.description).toHaveLength(3000);
    expect(result.image_url).toBe("https://source.test/photo");
    expect(fallbackOEmbed(parseHead(""), base).title).toBe(base.hostname);
    const emptyResources = parseHead(
      '<link rel=alternate type="application/json+oembed" href=""><link rel=icon href=""><meta property=og:image content=""><meta property=og:logo content="">',
    );
    expect(discoverOEmbed(emptyResources, base)).toBeUndefined();
    const emptyMetadata = fallbackOEmbed(emptyResources, base);
    expect(emptyMetadata.image_url).toBeUndefined();
    expect(emptyMetadata.icon_url).toBeUndefined();
  });

  it("preserves long signed queries through discovery, image, thumbnail and icon extraction", () => {
    const signed = `http://assets.test/item?signature=${"a".repeat(2200)}%2Btail`;
    const head =
      parseHead(`<link rel=alternate type="application/json+oembed" href="${signed}">
      <meta property=og:image content="${signed}"><meta property=og:image:width content=200>
      <meta property=og:image:height content=100><link rel=icon href="${signed}">`);
    expect(discoverOEmbed(head, base)?.href).toBe(signed);
    expect(fallbackOEmbed(head, base)).toMatchObject({
      image_url: signed,
      thumbnail_url: signed,
      icon_url: signed,
    });
    // These URL-valued meta fields used to pass through the prose truncator too.
    const fallback = fallbackOEmbed(
      parseHead(
        `<meta name=twitter:image content="${signed}"><meta property=og:logo content="${signed}">`,
      ),
      base,
    );
    expect(fallback).toMatchObject({ image_url: signed, icon_url: signed });
  });

  it("prefers declared icons to touch/logo hints, rejecting unsafe URLs without guessing assets", () => {
    const result = fallbackOEmbed(
      parseHead(`<link rel=apple-touch-icon href="/touch">
      <meta property=og:logo content="/logo"><link rel="shortcut ICON" href="../icon?a=1&amp;b=2">
      <meta property=og:image content="javascript:x">`),
      base,
    );
    expect(result.icon_url).toBe("https://source.test/icon?a=1&b=2");
    expect(result.image_url).toBeUndefined();
    const unsafe = parseHead(
      '<link rel=alternate type="application/json+oembed" href="https://user:secret@other.test/api"><link rel=icon href="data:image/png,AA">',
    );
    expect(discoverOEmbed(unsafe, base)).toBeUndefined();
    expect(fallbackOEmbed(unsafe, base).icon_url).toBeUndefined();
  });
});
