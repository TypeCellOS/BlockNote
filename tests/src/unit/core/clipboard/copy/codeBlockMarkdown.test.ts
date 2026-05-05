import { TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";

import { selectedFragmentToHTML } from "@blocknote/core";

import { createTestEditor } from "../../createTestEditor.js";
import { testSchema } from "../../testSchema.js";
import { getPosOfTextNode } from "../../../shared/testUtil.js";

// Regression test: copying inline content from inside a code block previously
// produced a `text/plain` markdown payload where every newline was prefixed
// with a backslash (markdown's hard-break syntax leaking through). The root
// cause was that the external HTML for the selection lacked a `<pre><code>`
// wrapper, so `<br>` separators in the inline content turned into hard
// breaks when converted to markdown. Wrapping the selection as code fixes
// both the HTML semantics and the markdown output.
describe("Copying from inside a code block", () => {
  const getEditor = createTestEditor(testSchema);

  const setupCodeBlockSelection = (
    editor: ReturnType<typeof getEditor>,
    codeContent: string,
    selectStart?: number,
    selectEnd?: number,
  ) => {
    editor.replaceBlocks(editor.document, [
      {
        type: "codeBlock",
        props: { language: "javascript" },
        content: codeContent,
      },
    ]);

    editor.transact((tr) => {
      const startPos = getPosOfTextNode(tr.doc, codeContent);
      const from = startPos + (selectStart ?? 0);
      const to =
        selectEnd === undefined
          ? getPosOfTextNode(tr.doc, codeContent, true)
          : startPos + selectEnd;
      tr.setSelection(TextSelection.create(tr.doc, from, to));
    });
  };

  it("uses the code block's normal external HTML, with language attrs and literal newlines", () => {
    const editor = getEditor();
    const codeContent = "{\n  abc: '34\n\n}";

    setupCodeBlockSelection(editor, codeContent);

    const { externalHTML } = selectedFragmentToHTML(
      editor.prosemirrorView,
      editor,
    );

    expect(externalHTML).toMatch(/^<pre[^>]*><code[^>]*>/);
    expect(externalHTML).toMatch(/<\/code><\/pre>$/);
    expect(externalHTML).toContain('data-language="javascript"');
    expect(externalHTML).toContain("language-javascript");
    // Newlines stay as literal `\n` text — no `<br>` separators that would
    // turn into markdown hard-breaks downstream.
    expect(externalHTML).not.toContain("<br");
    expect(externalHTML).toContain(codeContent);
  });

  it("does not insert backslashes before newlines in text/plain", () => {
    const editor = getEditor();
    const codeContent = "{\n  abc: '34\n\n}";

    setupCodeBlockSelection(editor, codeContent);

    const { markdown } = selectedFragmentToHTML(
      editor.prosemirrorView,
      editor,
    );

    expect(markdown).not.toMatch(/\\\n/);
    // Markdown should be a fenced code block preserving the original content.
    expect(markdown).toContain("```");
    expect(markdown).toContain(codeContent);
  });

  it("does not affect copies from non-code blocks", () => {
    const editor = getEditor();
    const paragraphText = "hello world";

    editor.replaceBlocks(editor.document, [
      {
        type: "paragraph",
        content: paragraphText,
      },
    ]);

    editor.transact((tr) => {
      const startPos = getPosOfTextNode(tr.doc, paragraphText);
      const endPos = getPosOfTextNode(tr.doc, paragraphText, true);
      tr.setSelection(TextSelection.create(tr.doc, startPos, endPos));
    });

    const { externalHTML, markdown } = selectedFragmentToHTML(
      editor.prosemirrorView,
      editor,
    );

    expect(externalHTML).not.toContain("<pre");
    expect(markdown).not.toContain("```");
    expect(markdown.trim()).toBe(paragraphText);
  });
});
