import {
  BlockNoteSchema,
  createBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { describe, expect } from "vite-plus/test";
import type { SetupEditor } from "../../../../../tests/src/commands/browser/setupEditor.js";

import {
  assertBlockContract,
  htmlFormat,
  markdownFormat,
  type NamedFormat,
  plainTextFormat,
} from "./index.js";

const markdown: NamedFormat = { name: "markdown", format: markdownFormat };
const html: NamedFormat = { name: "HTML", format: htmlFormat };
const plainText: NamedFormat = { name: "plain text", format: plainTextFormat };

/** A note with a kind and a text. `implementation` gives its export and its parse. */
async function editorWithNote(
  setupEditor: SetupEditor,
  implementation: Omit<
    Parameters<typeof createBlockSpec>[1] & object,
    "render"
  >,
) {
  const note = createBlockSpec(
    {
      type: "note" as const,
      propSchema: { kind: { default: "info" }, text: { default: "" } },
      content: "none",
    },
    {
      render: (block) => {
        const dom = document.createElement("div");
        dom.textContent = block.props.text;
        return { dom };
      },
      ...implementation,
    },
  )();
  const { editor } = await setupEditor({
    mountType: false,
    schema: BlockNoteSchema.create().extend({
      blockSpecs: { ...defaultBlockSpecs, note },
    }),
  });
  return editor;
}

/** The export of a note that obeys the contract: a code block with the kind as its language. */
function noteAsCode(block: { props: { kind: string; text: string } }) {
  const dom = document.createElement("pre");
  const code = document.createElement("code");
  code.className = `language-note-${block.props.kind}`;
  code.dataset.language = `note-${block.props.kind}`;
  code.textContent = block.props.text;
  dom.append(code);
  return { dom };
}

function parseNote(element: HTMLElement) {
  const code = element.tagName === "PRE" ? element.querySelector("code") : null;
  const language = code?.dataset.language ?? "";
  return code !== null && language.startsWith("note-")
    ? { kind: language.slice("note-".length), text: code.textContent ?? "" }
    : undefined;
}

const notes = [
  { type: "note", props: { kind: "info", text: "Read this first" } },
  { type: "note", props: { kind: "warning", text: "Do not do this" } },
];

describe("assertBlockContract", () => {
  it("accepts the default blocks in markdown and in HTML, and gives the text of each block", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({ mountType: false });
    const texts = assertBlockContract(editor, {
      blocks: [
        { type: "heading", props: { level: 2 }, content: "A heading" },
        { type: "bulletListItem", content: "An item" },
        { type: "codeBlock", props: { language: "ts" }, content: "let a;" },
        { type: "quote", content: "A quote" },
      ],
      formats: [markdown, html],
    });

    expect(texts.filter(({ format }) => format === "markdown")).toEqual([
      {
        format: "markdown",
        type: "heading",
        text: "## A heading\n",
        hidden: [],
      },
      {
        format: "markdown",
        type: "bulletListItem",
        text: "* An item\n",
        hidden: [],
      },
      {
        format: "markdown",
        type: "codeBlock",
        text: "```ts\nlet a;\n```\n",
        hidden: [],
      },
      { format: "markdown", type: "quote", text: "> A quote\n", hidden: [] },
    ]);
    expect(texts).toHaveLength(8);
  });

  it("names the data of a block that the format does not show", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({ mountType: false });
    const paragraph = {
      type: "paragraph",
      props: { textColor: "red" },
      content: [{ type: "text", text: "Text", styles: { underline: true } }],
    };

    expect(
      assertBlockContract(editor, {
        blocks: [paragraph],
        formats: [markdown, html],
      }),
    ).toEqual([
      {
        format: "markdown",
        type: "paragraph",
        text: "Text\n",
        hidden: ["textColor", "content"],
      },
      {
        format: "HTML",
        type: "paragraph",
        // The color value is of the theme, and the order of the attributes
        // is of the browser engine.
        text: expect.stringMatching(
          /^<p (?=[^>]*style="color: rgb\(\d+, \d+, \d+\);")(?=[^>]*data-text-color="red")[^>]*><u>Text<\/u><\/p>$/,
        ),
        hidden: [],
      },
    ]);
  });

  it("accepts a custom block whose export reads back as the same block", async ({
    setupEditor,
  }) => {
    const editor = await editorWithNote(setupEditor, {
      toExternalHTML: noteAsCode,
      parse: parseNote,
      // The code block also reads a `pre` element.
      runsBefore: ["codeBlock"],
    });

    const texts = assertBlockContract(editor, {
      blocks: notes,
      formats: [markdown, html],
    });

    expect(texts[0]).toEqual({
      format: "markdown",
      type: "note",
      text: "```note-info\nRead this first\n```\n",
      hidden: [],
    });
  });

  it("rule 4: throws for a block that reads back as a different type", async ({
    setupEditor,
  }) => {
    // The export is a code block, and no `parse` reads it back as a note.
    const editor = await editorWithNote(setupEditor, {
      toExternalHTML: noteAsCode,
    });

    expect(() =>
      assertBlockContract(editor, { blocks: notes, formats: [markdown] }),
    ).toThrow(
      'Contract for block authors, rule 4 (block type "note", markdown): the block reads back as the type "codeBlock".',
    );
  });

  it("rule 2: throws for a block whose text joins the text of the next block", async ({
    setupEditor,
  }) => {
    // A `div` with text is not a block of its own in markdown.
    const editor = await editorWithNote(setupEditor, {
      toExternalHTML: (block: { props: { text: string } }) => {
        const dom = document.createElement("div");
        dom.textContent = block.props.text;
        return { dom };
      },
    });

    expect(() =>
      assertBlockContract(editor, { blocks: notes, formats: [markdown] }),
    ).toThrow(
      'Contract for block authors, rule 2 (block type "note", markdown): the text of a paragraph, the block and a paragraph reads back as',
    );
  });

  it("rule 6: throws for two different blocks with the same text", async ({
    setupEditor,
  }) => {
    // The export does not show the kind and the text of the note.
    const editor = await editorWithNote(setupEditor, {
      toExternalHTML: () => {
        const dom = document.createElement("pre");
        dom.innerHTML = '<code data-language="note">A note</code>';
        return { dom };
      },
      parse: (element: HTMLElement) =>
        element.querySelector('code[data-language="note"]') === null
          ? undefined
          : {},
      runsBefore: ["codeBlock"],
    });

    expect(() =>
      assertBlockContract(editor, { blocks: notes, formats: [markdown] }),
    ).toThrow(
      'Contract for block authors, rule 6 (block type "note", markdown): two different example blocks give the same text',
    );
    // One example alone obeys the other rules: its props are hidden data.
    expect(
      assertBlockContract(editor, { blocks: [notes[1]], formats: [markdown] }),
    ).toMatchObject([{ hidden: ["kind", "text"] }]);
  });

  it("rule 8: throws for a block that a format does not show, unless `hiddenIn` names the format", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({ mountType: false });
    const image = {
      type: "image",
      props: { url: "https://example.com/a.png" },
    };

    expect(() =>
      assertBlockContract(editor, { blocks: [image], formats: [plainText] }),
    ).toThrow(
      'Contract for block authors, rule 8 (block type "image", plain text): the format does not show the block.',
    );
    expect(
      assertBlockContract(editor, {
        blocks: [image],
        formats: [plainText],
        hiddenIn: ["plain text"],
      }),
    ).toEqual([
      { format: "plain text", type: "image", text: undefined, hidden: [] },
    ]);
    expect(() =>
      assertBlockContract(editor, {
        blocks: [image],
        formats: [markdown],
        hiddenIn: ["markdown"],
      }),
    ).toThrow("the format shows the block, but `hiddenIn` names the format.");
  });
});
