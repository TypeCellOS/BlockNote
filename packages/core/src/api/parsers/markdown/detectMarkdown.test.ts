import { describe, expect, it } from "vitest";
import { isMarkdown } from "./detectMarkdown.js";

describe("isMarkdown", () => {
  describe("Headings (H1-H6)", () => {
    it("should detect H1 headings", () => {
      expect(isMarkdown("# Heading 1\n\nContent")).toBe(true);
      expect(isMarkdown("  # Heading 1\n\nContent")).toBe(true);
      expect(isMarkdown("   # Heading 1\n\nContent")).toBe(true);
    });

    it("should detect H2-H6 headings", () => {
      expect(isMarkdown("## Heading 2\n\nContent")).toBe(true);
      expect(isMarkdown("### Heading 3\n\nContent")).toBe(true);
      expect(isMarkdown("#### Heading 4\n\nContent")).toBe(true);
      expect(isMarkdown("##### Heading 5\n\nContent")).toBe(true);
      expect(isMarkdown("###### Heading 6\n\nContent")).toBe(true);
    });

    it("should not detect invalid headings", () => {
      expect(isMarkdown("####### Heading 7\n\nContent")).toBe(false);
      expect(isMarkdown("#Heading without space\n\nContent")).toBe(false);
      expect(isMarkdown("# \n\nContent")).toBe(false);
      expect(
        isMarkdown(
          "# Very long heading that exceeds the character limit and should not be detected as a valid markdown heading\n\nContent",
        ),
      ).toBe(false);
    });
  });

  describe("Bold, italic, underline, strikethrough, highlight", () => {
    it("should detect bold text", () => {
      expect(isMarkdown("**bold text**")).toBe(true);
      expect(isMarkdown("__bold text__")).toBe(true);
      expect(isMarkdown(" *bold text* ")).toBe(true);
      expect(isMarkdown(" _bold text_ ")).toBe(true);
    });

    it("should detect italic text", () => {
      expect(isMarkdown("*italic text*")).toBe(true);
      expect(isMarkdown("_italic text_")).toBe(true);
    });

    it("should detect strikethrough text", () => {
      expect(isMarkdown("~~strikethrough text~~")).toBe(true);
    });

    it("should detect highlighted text", () => {
      expect(isMarkdown("==highlighted text==")).toBe(true);
      expect(isMarkdown("++highlighted text++")).toBe(true);
    });
  });

  describe("Links", () => {
    it("should detect basic links", () => {
      expect(isMarkdown("[Link text](https://example.com)")).toBe(true);
      expect(isMarkdown("[Link text](http://example.com)")).toBe(true);
      expect(isMarkdown("[Short](https://ex.com)")).toBe(true);
    });

    it("should detect image links", () => {
      expect(isMarkdown("![Alt text](https://example.com/image.jpg)")).toBe(
        true,
      );
    });
  });

  describe("Inline code", () => {
    it("should detect inline code", () => {
      expect(isMarkdown("`code`")).toBe(true);
      expect(isMarkdown(" `code` ")).toBe(true);
      expect(isMarkdown("`const x = 1;`")).toBe(true);
    });

    it("should not detect invalid inline code", () => {
      expect(isMarkdown("` code `")).toBe(false); // spaces around content
      expect(isMarkdown("``")).toBe(false); // empty
      expect(isMarkdown("` `")).toBe(false); // only space
    });
  });

  describe("Unordered lists", () => {
    it("should detect unordered lists", () => {
      expect(isMarkdown("- Item 1\n- Item 2")).toBe(true);
      expect(isMarkdown(" - Item 1\n - Item 2")).toBe(true);
      expect(isMarkdown("  - Item 1\n  - Item 2")).toBe(true);
      expect(isMarkdown("   - Item 1\n   - Item 2")).toBe(true);
      expect(isMarkdown("    - Item 1\n    - Item 2")).toBe(true);
      expect(isMarkdown("     - Item 1\n     - Item 2")).toBe(true);
    });

    it("should not detect invalid unordered lists", () => {
      expect(isMarkdown("- Item 1")).toBe(false); // single item
      expect(isMarkdown("-- Item 1\n-- Item 2")).toBe(false); // wrong marker
      expect(isMarkdown("-Item 1\n-Item 2")).toBe(false); // no space after marker
    });
  });

  describe("Ordered lists", () => {
    it("should detect ordered lists", () => {
      expect(isMarkdown("1. Item 1\n2. Item 2")).toBe(true);
      expect(isMarkdown(" 1. Item 1\n 2. Item 2")).toBe(true);
      expect(isMarkdown("  1. Item 1\n  2. Item 2")).toBe(true);
      expect(isMarkdown("   1. Item 1\n   2. Item 2")).toBe(true);
      expect(isMarkdown("    1. Item 1\n    2. Item 2")).toBe(true);
      expect(isMarkdown("     1. Item 1\n     2. Item 2")).toBe(true);
    });

    it("should not detect invalid ordered lists", () => {
      expect(isMarkdown("1. Item 1")).toBe(false); // single item
      expect(isMarkdown("1 Item 1\n2 Item 2")).toBe(false); // no dot
      expect(isMarkdown("1.Item 1\n2.Item 2")).toBe(false); // no space after dot
    });
  });

  describe("Horizontal rules", () => {
    it("should detect horizontal rules", () => {
      expect(isMarkdown("\n\n ---\n\n")).toBe(true);
      expect(isMarkdown("\n\n ----\n\n")).toBe(true);
      expect(isMarkdown("\n\n  ---\n\n")).toBe(true);
      expect(isMarkdown("\n\n   ---\n\n")).toBe(true);
    });
  });

  describe("Fenced code blocks", () => {
    it("should detect fenced code blocks", () => {
      expect(isMarkdown("```\ncode block\n```")).toBe(true);
      expect(isMarkdown("~~~\ncode block\n~~~")).toBe(true);
      expect(isMarkdown("```javascript\nconst x = 1;\n```")).toBe(true);
      expect(isMarkdown("```js\nconst x = 1;\n```")).toBe(true);
    });
  });

  describe("Classical underlined headings", () => {
    it("should detect H1 with equals", () => {
      expect(isMarkdown("Heading\n===\n\nContent")).toBe(true);
      expect(isMarkdown("Heading\n====\n\nContent")).toBe(true);
    });

    it("should detect H2 with dashes", () => {
      expect(isMarkdown("Heading\n---\n\nContent")).toBe(true);
      expect(isMarkdown("Heading\n----\n\nContent")).toBe(true);
    });
  });

  describe("Blockquotes", () => {
    it("should detect blockquotes", () => {
      expect(isMarkdown("> This is a blockquote\n\nContent")).toBe(true);
      expect(isMarkdown(" > This is a blockquote\n\nContent")).toBe(true);
      expect(isMarkdown("  > This is a blockquote\n\nContent")).toBe(true);
      expect(isMarkdown("   > This is a blockquote\n\nContent")).toBe(true);
    });

    it("should detect multi-line blockquotes", () => {
      expect(isMarkdown("> Line 1\n> Line 2\n\nContent")).toBe(true);
      expect(isMarkdown("> Line 1\n> Line 2\n> Line 3\n\nContent")).toBe(true);
    });
  });

  describe("Tables", () => {
    it("should detect table headers", () => {
      expect(isMarkdown("| Header 1 | Header 2 |\n")).toBe(true);
      expect(isMarkdown("| Header 1 | Header 2 | Header 3 |\n")).toBe(true);
    });

    it("should detect table dividers", () => {
      expect(isMarkdown("| --- | --- |\n")).toBe(true);
      expect(isMarkdown("| :--- | ---: |\n")).toBe(true);
      expect(isMarkdown("| :---: | --- |\n")).toBe(true);
    });

    it("should detect table rows", () => {
      expect(isMarkdown("| Cell 1 | Cell 2 |\n")).toBe(true);
      expect(isMarkdown("| Cell 1 | Cell 2 | Cell 3 |\n")).toBe(true);
    });

    it("should detect complete tables", () => {
      const table =
        "| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n";
      expect(isMarkdown(table)).toBe(true);
    });

    it("should not detect invalid tables", () => {
      expect(isMarkdown("| Header 1 | Header 2\n")).toBe(false); // missing closing pipe
      expect(isMarkdown("Header 1 | Header 2 |\n")).toBe(false); // missing opening pipe
    });
  });

  describe("Edge cases and combinations", () => {
    it("should detect mixed markdown content", () => {
      const mixedContent =
        "# Heading\n\nThis is **bold** and *italic* text with a [link](https://example.com).\n\n- List item 1\n- List item 2\n\n> Blockquote\n\n```\ncode block\n```";
      expect(isMarkdown(mixedContent)).toBe(true);
    });

    it("should not detect plain text", () => {
      expect(
        isMarkdown("This is just plain text without any markdown formatting."),
      ).toBe(false);
      expect(isMarkdown("")).toBe(false);
      expect(isMarkdown("   \n   \n   ")).toBe(false); // only whitespace
    });

    it("should handle special characters", () => {
      expect(isMarkdown("**text with `backticks`**")).toBe(true);
      expect(isMarkdown("**text with [brackets]**")).toBe(true);
      expect(isMarkdown("**text with (parentheses)**")).toBe(true);
    });
  });
});
