import { describe, expect, it } from "vite-plus/test";
import { validateOEmbed } from "./oembed.js";

describe("best-effort oEmbed projection", () => {
  it("keeps usable media without version, per-field size or thumbnail-cap restrictions", () => {
    const photo = {
      type: "photo",
      url: "https://assets.test/photo",
      width: 12000,
      height: 8000,
      title: "x".repeat(3000),
      thumbnail_url: "https://assets.test/thumb",
      thumbnail_width: 200,
      thumbnail_height: 100,
    };
    expect(validateOEmbed({ ...photo, private: "unknown field" })).toEqual({
      ...photo,
      version: "1.0",
    });
  });

  it("degrades unusable media to its text rather than special-casing providers", () => {
    expect(
      validateOEmbed({
        type: "rich",
        html: "<blockquote>Post</blockquote>",
        width: 600,
        height: null,
        title: "Post",
      }),
    ).toEqual({ version: "1.0", type: "link", title: "Post" });
    expect(validateOEmbed({ unexpected: true })).toBeUndefined();
  });
});
