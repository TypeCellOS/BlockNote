import { describe, expect } from "vite-plus/test";
import { formatLinkDestination } from "./formatLinkDestination.js";

describe("formatLinkDestination", () => {
  it.each([
    "https://example.com/my file.pdf",
    " https://example.com/file.pdf",
    "https://example.com/file.pdf ",
  ])("puts %j in angle brackets", (destination) => {
    expect(formatLinkDestination(destination)).toBe(`<${destination}>`);
  });

  it.each([
    ["my\tfile.pdf", "my%09file.pdf"],
    ["my\nfile.pdf", "my%0Afile.pdf"],
    ["my\rfile.pdf", "my%0Dfile.pdf"],
    ["my file>v.pdf", "<my file\\>v.pdf>"],
  ])("writes %j as %j", (destination, markdown) => {
    expect(formatLinkDestination(destination)).toBe(markdown);
  });

  it.each(["", "https://example.com/file.pdf", "my%20file.pdf"])(
    "leaves %j, which has no white space, unchanged",
    (destination) => {
      expect(formatLinkDestination(destination)).toBe(destination);
    },
  );

  it("leaves a destination with a no-break space unchanged", () => {
    // The markdown parser reads a no-break space as a part of the URL.
    const destination = "https://example.com/my file.pdf";
    expect(formatLinkDestination(destination)).toBe(destination);
  });
});
