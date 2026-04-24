import { afterEach, describe, expect, it } from "vitest";
import { TextSelection } from "@tiptap/pm/state";
import { Slice, Fragment } from "@tiptap/pm/model";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { findLinks, tokenizeLink } from "./helpers/linkDetector.js";
import { isAllowedUri } from "./link.js";

/**
 * @vitest-environment jsdom
 */

// ============================================================================
// Helpers
// ============================================================================

/** Wrapper matching the old tokenize().map(t => t.toObject(defaultProtocol)) pattern */
function tokenizeToObjects(text: string, defaultProtocol = "http") {
  return tokenizeLink(text, defaultProtocol);
}

/**
 * Mirrors the isValidLinkStructure function from autolink.ts.
 * A valid structure is either:
 * - A single link token
 * - A link token wrapped in () or []
 */
function isValidLinkStructure(
  tokens: Array<{ isLink: boolean; value: string }>
) {
  if (tokens.length === 1) {
    return tokens[0].isLink;
  }
  if (tokens.length === 3 && tokens[1].isLink) {
    return ["()", "[]"].includes(tokens[0].value + tokens[2].value);
  }
  return false;
}

function createEditor(links?: { isValidLink?: (href: string) => boolean }) {
  const editor = BlockNoteEditor.create(links ? { links } : undefined);
  const div = document.createElement("div");
  editor.mount(div);
  return editor;
}

/**
 * Insert text at the end of a block, followed by a space to trigger autolink.
 * Returns the link marks found in that block afterward.
 */
function typeTextThenSpace(
  editor: BlockNoteEditor<any, any, any>,
  blockId: string,
  text: string
) {
  editor.setTextCursorPosition(blockId, "end");
  const view = editor._tiptapEditor.view;
  const { from } = view.state.selection;

  // Insert the text
  view.dispatch(view.state.tr.insertText(text, from));

  // Now insert a space to trigger autolink
  const afterInsert = view.state.selection.from;
  view.dispatch(view.state.tr.insertText(" ", afterInsert));

  return getLinksInDocument(editor);
}

/**
 * Walk the ProseMirror doc and collect all link marks with their text and href.
 */
function getLinksInDocument(editor: BlockNoteEditor<any, any, any>) {
  const links: Array<{ text: string; href: string; from: number; to: number }> =
    [];
  const doc = editor._tiptapEditor.state.doc;
  const linkType = editor._tiptapEditor.schema.marks.link;

  doc.descendants((node, pos) => {
    if (node.isText && node.marks.length > 0) {
      const linkMark = node.marks.find((m) => m.type === linkType);
      if (linkMark) {
        links.push({
          text: node.text || "",
          href: linkMark.attrs.href,
          from: pos,
          to: pos + node.nodeSize,
        });
      }
    }
  });
  return links;
}

// ============================================================================
// Level 1: Unit tests for findLinks() and tokenizeLink()
// ============================================================================

describe("findLinks() baseline behavior", () => {
  describe("basic URL detection", () => {
    it("detects https URLs", () => {
      const results = findLinks("https://example.com");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        isLink: true,
        value: "https://example.com",
        href: "https://example.com",
        start: 0,
        end: 19,
      });
    });

    it("detects http URLs", () => {
      const results = findLinks("http://example.com");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        isLink: true,
        value: "http://example.com",
        href: "http://example.com",
      });
    });

    it("detects schemeless URLs and prepends default protocol", () => {
      const results = findLinks("example.com");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        isLink: true,
        value: "example.com",
        href: "http://example.com",
        start: 0,
        end: 11,
      });
    });

    it("respects defaultProtocol option", () => {
      const results = findLinks("example.com", { defaultProtocol: "https" });
      expect(results).toHaveLength(1);
      expect(results[0].href).toBe("https://example.com");
    });

    it("detects www URLs", () => {
      const results = findLinks("www.example.com");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        isLink: true,
        value: "www.example.com",
        href: "http://www.example.com",
      });
    });
  });

  describe("multiple URLs in text", () => {
    it("finds multiple URLs with correct positions", () => {
      const results = findLinks("Visit https://a.com and https://b.com");
      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        value: "https://a.com",
        start: 6,
        end: 19,
      });
      expect(results[1]).toMatchObject({
        value: "https://b.com",
        start: 24,
        end: 37,
      });
    });

    it("finds multiple schemeless URLs", () => {
      const results = findLinks("Check example.com or test.org");
      expect(results).toHaveLength(2);
      expect(results[0].value).toBe("example.com");
      expect(results[1].value).toBe("test.org");
    });
  });

  describe("URLs with paths, queries, and fragments", () => {
    it("includes full path", () => {
      const results = findLinks("https://example.com/path/to/page");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com/path/to/page");
    });

    it("includes query string", () => {
      const results = findLinks("https://example.com?q=hello&b=world");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com?q=hello&b=world");
    });

    it("includes fragment", () => {
      const results = findLinks("https://example.com#section");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com#section");
    });

    it("includes path + query + fragment", () => {
      const results = findLinks("https://example.com/path?q=1#frag");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com/path?q=1#frag");
    });

    it("includes encoded characters", () => {
      const results = findLinks("https://example.com/path%20name");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com/path%20name");
    });

    it("includes trailing slash", () => {
      const results = findLinks("https://example.com/");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com/");
    });
  });

  describe("URLs with ports", () => {
    it("detects URL with port", () => {
      const results = findLinks("https://example.com:8080");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com:8080");
    });

    it("detects schemeless URL with port and path", () => {
      const results = findLinks("example.com:3000/path");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        value: "example.com:3000/path",
        href: "http://example.com:3000/path",
      });
    });
  });

  describe("trailing punctuation handling", () => {
    it("excludes trailing period", () => {
      const results = findLinks("Visit https://example.com.");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com");
    });

    it("excludes trailing comma", () => {
      const results = findLinks("See https://example.com, and more");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com");
    });

    it("excludes surrounding parentheses", () => {
      const results = findLinks("(https://example.com)");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        value: "https://example.com",
        start: 1,
        end: 20,
      });
    });

    it("keeps balanced parentheses in path (Wikipedia-style)", () => {
      const results = findLinks(
        "https://en.wikipedia.org/wiki/Foo_(bar)"
      );
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe(
        "https://en.wikipedia.org/wiki/Foo_(bar)"
      );
    });
  });

  describe("non-links", () => {
    it("returns empty for plain text", () => {
      expect(findLinks("not a link")).toHaveLength(0);
    });

    it("returns empty for single word", () => {
      expect(findLinks("hello")).toHaveLength(0);
    });

    it("returns empty for empty string", () => {
      expect(findLinks("")).toHaveLength(0);
    });

    it("returns empty for just a protocol", () => {
      expect(findLinks("https://")).toHaveLength(0);
    });

    it("does not detect bare IP addresses", () => {
      expect(findLinks("192.168.1.1")).toHaveLength(0);
    });
  });

  describe("domain variations", () => {
    it("detects hyphenated domains", () => {
      const results = findLinks("my-site.example.com");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("my-site.example.com");
    });

    it("detects subdomains", () => {
      const results = findLinks("sub.domain.example.com");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("sub.domain.example.com");
    });
  });

  describe("URL position in text", () => {
    it("detects URL at end of text", () => {
      const results = findLinks("go to example.com");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        value: "example.com",
        start: 6,
        end: 17,
      });
    });

    it("detects URL at start of text", () => {
      const results = findLinks("example.com is great");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        value: "example.com",
        start: 0,
        end: 11,
      });
    });
  });

  describe("protocol variations", () => {
    it("detects ftp URLs", () => {
      const results = findLinks("ftp://files.example.com");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("ftp://files.example.com");
    });

    it("detects mailto URLs", () => {
      const results = findLinks("mailto:user@example.com");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        value: "mailto:user@example.com",
        href: "mailto:user@example.com",
      });
    });

    it("detects bare email addresses as links", () => {
      const results = findLinks("user@example.com");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        isLink: true,
        value: "user@example.com",
        href: "mailto:user@example.com",
      });
    });
  });

  describe("boundary handling", () => {
    it("stops at whitespace", () => {
      const results = findLinks("https://example.com/path with spaces");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com/path");
    });
  });
});

describe("tokenizeLink() baseline behavior", () => {
  describe("single valid links", () => {
    it("tokenizes schemeless URL as single link token", () => {
      const tokens = tokenizeToObjects("example.com");
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        isLink: true,
        value: "example.com",
        href: "http://example.com",
        start: 0,
        end: 11,
      });
    });

    it("tokenizes https URL as single link token", () => {
      const tokens = tokenizeToObjects("https://example.com");
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        isLink: true,
        value: "https://example.com",
        href: "https://example.com",
      });
    });

    it("tokenizes URL with path as single link token", () => {
      const tokens = tokenizeToObjects("example.com/path");
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        isLink: true,
        value: "example.com/path",
        href: "http://example.com/path",
      });
    });

    it("tokenizes www URL as single link token", () => {
      const tokens = tokenizeToObjects("www.example.com");
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        isLink: true,
        value: "www.example.com",
        href: "http://www.example.com",
      });
    });

    it("tokenizes URL with https and path as single link token", () => {
      const tokens = tokenizeToObjects("https://example.com/path");
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        isLink: true,
        value: "https://example.com/path",
        href: "https://example.com/path",
      });
    });

    it("tokenizes short TLD (2 chars) as link", () => {
      const tokens = tokenizeToObjects("test.co");
      expect(tokens).toHaveLength(1);
      expect(tokens[0].isLink).toBe(true);
    });
  });

  describe("bracket-wrapped links", () => {
    it("tokenizes (url) as 3 tokens with link in middle", () => {
      const tokens = tokenizeToObjects("(example.com)");
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toMatchObject({
        isLink: false,
        value: "(",
        start: 0,
        end: 1,
      });
      expect(tokens[1]).toMatchObject({
        isLink: true,
        value: "example.com",
        href: "http://example.com",
        start: 1,
        end: 12,
      });
      expect(tokens[2]).toMatchObject({
        isLink: false,
        value: ")",
        start: 12,
        end: 13,
      });
    });

    it("tokenizes [url] as 3 tokens with link in middle", () => {
      const tokens = tokenizeToObjects("[example.com]");
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toMatchObject({ isLink: false, value: "[" });
      expect(tokens[1]).toMatchObject({
        isLink: true,
        value: "example.com",
      });
      expect(tokens[2]).toMatchObject({ isLink: false, value: "]" });
    });

    it("tokenizes (https://url) as 3 tokens", () => {
      const tokens = tokenizeToObjects("(https://example.com)");
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toMatchObject({ isLink: false, value: "(" });
      expect(tokens[1]).toMatchObject({
        isLink: true,
        value: "https://example.com",
        href: "https://example.com",
      });
      expect(tokens[2]).toMatchObject({ isLink: false, value: ")" });
    });
  });

  describe("non-links", () => {
    it("tokenizes plain word as non-link", () => {
      const tokens = tokenizeToObjects("notaurl");
      expect(tokens).toHaveLength(1);
      expect(tokens[0].isLink).toBe(false);
    });

    it("tokenizes domain with trailing number as non-link", () => {
      // This is a key behavior: example.com1 is NOT a valid link
      // because the TLD is "com1" which is not valid
      const tokens = tokenizeToObjects("example.com1");
      expect(tokens).toHaveLength(1);
      expect(tokens[0].isLink).toBe(false);
    });

    it("tokenizes single-char TLD as non-link", () => {
      const tokens = tokenizeToObjects("test.x");
      expect(tokens).toHaveLength(1);
      expect(tokens[0].isLink).toBe(false);
    });

    it("tokenizes single-char hostname as non-link", () => {
      const tokens = tokenizeToObjects("a.bc");
      expect(tokens).toHaveLength(1);
      expect(tokens[0].isLink).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("tokenizes IP address as non-link", () => {
      const tokens = tokenizeToObjects("192.168.1.1");
      expect(tokens).toHaveLength(1);
      expect(tokens[0].isLink).toBe(false);
    });

    it("tokenizes localhost as link (filtered downstream by shouldAutoLink)", () => {
      const tokens = tokenizeToObjects("localhost");
      expect(tokens).toHaveLength(1);
      expect(tokens[0].isLink).toBe(true);
    });

    it("tokenizes url with trailing dot as url + dot tokens", () => {
      const tokens = tokenizeToObjects("example.com.");
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({
        isLink: true,
        value: "example.com",
      });
      expect(tokens[1]).toMatchObject({
        isLink: false,
        value: ".",
      });
    });

    it("tokenizes {url} as 3 tokens (curly braces)", () => {
      const tokens = tokenizeToObjects("{example.com}");
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toMatchObject({ isLink: false, value: "{" });
      expect(tokens[1]).toMatchObject({ isLink: true, value: "example.com" });
      expect(tokens[2]).toMatchObject({ isLink: false, value: "}" });
    });

    it("respects defaultProtocol parameter", () => {
      const tokens = tokenizeToObjects("example.com", "https");
      expect(tokens[0].href).toBe("https://example.com");
    });
  });
});

describe("isValidLinkStructure baseline", () => {
  it("accepts single link token", () => {
    const tokens = tokenizeToObjects("example.com");
    expect(isValidLinkStructure(tokens)).toBe(true);
  });

  it("accepts link wrapped in parentheses", () => {
    const tokens = tokenizeToObjects("(example.com)");
    expect(isValidLinkStructure(tokens)).toBe(true);
  });

  it("accepts link wrapped in square brackets", () => {
    const tokens = tokenizeToObjects("[example.com]");
    expect(isValidLinkStructure(tokens)).toBe(true);
  });

  it("rejects link wrapped in curly braces", () => {
    // {url} tokenizes to 3 tokens but {} is not in the accepted list
    const tokens = tokenizeToObjects("{example.com}");
    expect(isValidLinkStructure(tokens)).toBe(false);
  });

  it("rejects non-link single token", () => {
    const tokens = tokenizeToObjects("notaurl");
    expect(isValidLinkStructure(tokens)).toBe(false);
  });

  it("rejects url with trailing dot (2 tokens)", () => {
    const tokens = tokenizeToObjects("example.com.");
    expect(isValidLinkStructure(tokens)).toBe(false);
  });

  it("rejects example.com1 (invalid TLD)", () => {
    const tokens = tokenizeToObjects("example.com1");
    expect(isValidLinkStructure(tokens)).toBe(false);
  });
});

// ============================================================================
// Level 2: Integration tests through the editor
// ============================================================================

describe("Link extension autolink behavior", () => {
  let editor: BlockNoteEditor<any, any, any>;

  afterEach(() => {
    if (editor) {
      editor._tiptapEditor.destroy();
    }
  });

  function setupEditorWithBlock(content = "") {
    editor = createEditor();
    editor.replaceBlocks(editor.document, [
      {
        id: "test-block",
        type: "paragraph",
        content: content || undefined,
      },
    ]);
    return editor;
  }

  describe("should autolink", () => {
    it("autolinks https URL when followed by space", () => {
      setupEditorWithBlock();
      const links = typeTextThenSpace(editor, "test-block", "https://example.com");
      expect(links).toHaveLength(1);
      expect(links[0].href).toBe("https://example.com");
      expect(links[0].text).toBe("https://example.com");
    });

    it("autolinks http URL when followed by space", () => {
      setupEditorWithBlock();
      const links = typeTextThenSpace(editor, "test-block", "http://example.com");
      expect(links).toHaveLength(1);
      expect(links[0].href).toBe("http://example.com");
    });

    it("autolinks schemeless URL with default protocol (https in BlockNote)", () => {
      setupEditorWithBlock();
      const links = typeTextThenSpace(editor, "test-block", "example.com");
      expect(links).toHaveLength(1);
      // BlockNote overrides the tiptap default to "https" via DEFAULT_LINK_PROTOCOL
      expect(links[0].href).toBe("https://example.com");
      expect(links[0].text).toBe("example.com");
    });

    it("autolinks www URL", () => {
      setupEditorWithBlock();
      const links = typeTextThenSpace(editor, "test-block", "www.example.com");
      expect(links).toHaveLength(1);
      expect(links[0].href).toBe("https://www.example.com");
    });

    it("autolinks URL with path and query", () => {
      setupEditorWithBlock();
      const links = typeTextThenSpace(
        editor,
        "test-block",
        "https://example.com/path?q=1"
      );
      expect(links).toHaveLength(1);
      expect(links[0].href).toBe("https://example.com/path?q=1");
    });
  });

  describe("should NOT autolink", () => {
    it("does not autolink plain text", () => {
      setupEditorWithBlock();
      const links = typeTextThenSpace(editor, "test-block", "notaurl");
      expect(links).toHaveLength(0);
    });

    it("does not autolink single word", () => {
      setupEditorWithBlock();
      const links = typeTextThenSpace(editor, "test-block", "hello");
      expect(links).toHaveLength(0);
    });

    it("does not autolink IP address without protocol", () => {
      setupEditorWithBlock();
      const links = typeTextThenSpace(editor, "test-block", "192.168.1.1");
      expect(links).toHaveLength(0);
    });

    it("does not autolink localhost (single-word hostname)", () => {
      setupEditorWithBlock();
      const links = typeTextThenSpace(editor, "test-block", "localhost");
      expect(links).toHaveLength(0);
    });

    it("does not autolink domain with trailing number (invalid TLD)", () => {
      setupEditorWithBlock();
      const links = typeTextThenSpace(editor, "test-block", "example.com1");
      expect(links).toHaveLength(0);
    });
  });

  describe("bracket-wrapped URLs", () => {
    it("autolinks URL in parentheses, linking only the URL", () => {
      setupEditorWithBlock();
      const links = typeTextThenSpace(
        editor,
        "test-block",
        "(https://example.com)"
      );
      expect(links).toHaveLength(1);
      expect(links[0].href).toBe("https://example.com");
      expect(links[0].text).toBe("https://example.com");
    });

    it("autolinks URL in square brackets, linking only the URL", () => {
      setupEditorWithBlock();
      const links = typeTextThenSpace(
        editor,
        "test-block",
        "[https://example.com]"
      );
      expect(links).toHaveLength(1);
      expect(links[0].href).toBe("https://example.com");
      expect(links[0].text).toBe("https://example.com");
    });
  });
});

describe("Link extension paste handler behavior", () => {
  let editor: BlockNoteEditor<any, any, any>;

  afterEach(() => {
    if (editor) {
      editor._tiptapEditor.destroy();
    }
  });

  it("applies link mark when pasting URL over selected text", () => {
    editor = createEditor();
    editor.replaceBlocks(editor.document, [
      {
        id: "test-block",
        type: "paragraph",
        content: "click here",
      },
    ]);

    // Select "click here"
    editor.setTextCursorPosition("test-block", "start");
    const view = editor._tiptapEditor.view;
    const doc = view.state.doc;

    // Find the text node position
    let textStart = 0;
    let textEnd = 0;
    doc.descendants((node, pos) => {
      if (node.isText && node.text === "click here") {
        textStart = pos;
        textEnd = pos + node.nodeSize;
      }
    });

    // Create selection over the text
    const tr = view.state.tr.setSelection(
      TextSelection.create(view.state.doc, textStart, textEnd)
    );
    view.dispatch(tr);

    // Create a minimal slice that looks like pasted URL text
    const textNode = view.state.schema.text("https://example.com");
    const slice = new Slice(Fragment.from(textNode), 0, 0);

    // Dispatch paste through the editor view
    const handled = view.someProp("handlePaste", (f) =>
      f(view, new ClipboardEvent("paste"), slice)
    );

    expect(handled).toBeTruthy();
    // Check that link mark was applied
    const links = getLinksInDocument(editor);
    expect(links).toHaveLength(1);
    expect(links[0].href).toBe("https://example.com");
    expect(links[0].text).toBe("click here");
  });

  it("does not apply link when pasting non-URL text over selection", () => {
    editor = createEditor();
    editor.replaceBlocks(editor.document, [
      {
        id: "test-block",
        type: "paragraph",
        content: "click here",
      },
    ]);

    editor.setTextCursorPosition("test-block", "start");
    const view = editor._tiptapEditor.view;
    const doc = view.state.doc;

    let textStart = 0;
    let textEnd = 0;
    doc.descendants((node, pos) => {
      if (node.isText && node.text === "click here") {
        textStart = pos;
        textEnd = pos + node.nodeSize;
      }
    });

    const tr = view.state.tr.setSelection(
      TextSelection.create(view.state.doc, textStart, textEnd)
    );
    view.dispatch(tr);

    const textNode = view.state.schema.text("not a url");
    const slice = new Slice(Fragment.from(textNode), 0, 0);

    const handled = view.someProp("handlePaste", (f) =>
      f(view, new ClipboardEvent("paste"), slice)
    );

    // Should not be handled (not a URL)
    expect(handled).toBeFalsy();

    // No links should exist
    const links = getLinksInDocument(editor);
    expect(links).toHaveLength(0);
  });

  it("does not apply link when pasting URL with empty selection", () => {
    editor = createEditor();
    editor.replaceBlocks(editor.document, [
      {
        id: "test-block",
        type: "paragraph",
        content: "some text",
      },
    ]);

    // Place cursor without selection
    editor.setTextCursorPosition("test-block", "end");
    const view = editor._tiptapEditor.view;

    const textNode = view.state.schema.text("https://example.com");
    const slice = new Slice(Fragment.from(textNode), 0, 0);

    const handled = view.someProp("handlePaste", (f) =>
      f(view, new ClipboardEvent("paste"), slice)
    );

    // Should not be handled because selection is empty
    expect(handled).toBeFalsy();
  });
});

describe("Link extension isValidLink option", () => {
  let editor: BlockNoteEditor<any, any, any>;

  afterEach(() => {
    if (editor) {
      editor._tiptapEditor.destroy();
    }
  });

  it("autolink: restrictive override blocks normally-valid URLs on typing", () => {
    editor = createEditor({ isValidLink: () => false });
    editor.replaceBlocks(editor.document, [
      {
        id: "test-block",
        type: "paragraph",
        content: "",
      },
    ]);

    const links = typeTextThenSpace(
      editor,
      "test-block",
      "https://example.com"
    );
    expect(links).toHaveLength(0);
  });

  it("paste-rule: restrictive override blocks pasted URL text", () => {
    editor = createEditor({ isValidLink: () => false });
    editor.replaceBlocks(editor.document, [
      {
        id: "test-block",
        type: "paragraph",
        content: "some text here",
      },
    ]);

    editor._tiptapEditor.commands.insertContent("https://example.com ");

    const links = getLinksInDocument(editor);
    expect(links).toHaveLength(0);
  });

  it("paste-handler: restrictive override blocks URL pasted over selection", () => {
    editor = createEditor({ isValidLink: () => false });
    editor.replaceBlocks(editor.document, [
      {
        id: "test-block",
        type: "paragraph",
        content: "click here",
      },
    ]);

    editor.setTextCursorPosition("test-block", "start");
    const view = editor._tiptapEditor.view;
    const doc = view.state.doc;

    let textStart = 0;
    let textEnd = 0;
    doc.descendants((node, pos) => {
      if (node.isText && node.text === "click here") {
        textStart = pos;
        textEnd = pos + node.nodeSize;
      }
    });

    const tr = view.state.tr.setSelection(
      TextSelection.create(view.state.doc, textStart, textEnd)
    );
    view.dispatch(tr);

    const textNode = view.state.schema.text("https://example.com");
    const slice = new Slice(Fragment.from(textNode), 0, 0);

    const handled = view.someProp("handlePaste", (f) =>
      f(view, new ClipboardEvent("paste"), slice)
    );

    expect(handled).toBeFalsy();
    const links = getLinksInDocument(editor);
    expect(links).toHaveLength(0);
  });

  it("parseHTML: permissive override accepts custom-scheme links", () => {
    editor = createEditor({
      isValidLink: (href) => isAllowedUri(href) || href.startsWith("myapp:"),
    });
    editor.pasteHTML(`<p><a href="myapp://foo">click</a></p>`);

    const links = getLinksInDocument(editor);
    expect(links).toHaveLength(1);
    expect(links[0].href).toBe("myapp://foo");
  });

  it("parseHTML: default rejects unknown-scheme links", () => {
    editor = createEditor();
    editor.pasteHTML(`<p><a href="myapp://foo">click</a></p>`);

    const links = getLinksInDocument(editor);
    expect(links).toHaveLength(0);
  });

  it("renderHTML: permissive override preserves custom-scheme href on export", () => {
    editor = createEditor({
      isValidLink: (href) => isAllowedUri(href) || href.startsWith("myapp:"),
    });
    editor.pasteHTML(`<p><a href="myapp://foo">click</a></p>`);

    const html = editor.blocksToFullHTML(editor.document);
    expect(html).toContain('href="myapp://foo"');
  });
});
