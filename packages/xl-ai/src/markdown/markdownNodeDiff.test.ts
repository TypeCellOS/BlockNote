import { describe, expect, it } from "vitest";
import {
  MarkdownNodeDiffResult,
  markdownNodeDiff,
} from "./markdownNodeDiff.js";
import { markdownNodeToString } from "./util.js";

async function operationsToReadableString(
  operations: MarkdownNodeDiffResult[]
) {
  return operations
    .map((op) => {
      const md = markdownNodeToString(
        op.type === "remove" ? op.oldBlock : op.newBlock
      );
      return `${op.type.toUpperCase()}: ${md}`;
    })
    .join("\n");
}

describe("markdown AI util", () => {
  it("collapse lines", async () => {
    const md1 = `# title

hello`;

    const md2 = `# titleworldhello`;

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });

  it("add sentence at end", async () => {
    const md1 = `# title

hello`;

    const md2 = `# title

hello

world`;

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });

  it("remove sentence at end", async () => {
    const md1 = `# title

hello

world`;

    const md2 = `# title

hello`;

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });

  it("add sentence at start", async () => {
    const md1 = `# title

hello

world`;

    const md2 = `prefix
# title

hello

world`;

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });

  it("remove sentence at start", async () => {
    const md1 = `# title
    
hello

world`;

    const md2 = `hello

world`;

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });

  it("add sentence at middle", async () => {
    const md1 = `# title

hello

world`;

    const md2 = `# title

hello

beautiful

world`;

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });

  it("remove sentence at middle", async () => {
    const md1 = `# title

hello

world`;

    const md2 = `# title

world`;

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });

  it("change: type at start", async () => {
    const md1 = `# title

hello

world`;

    const md2 = `title

hello

wold`;

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });

  it("change: type at end", async () => {
    const md1 = `# title

hello

world`;

    const md2 = `# title

hello

# world`;

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });

  it("change: text at end", async () => {
    const md1 = `# title

hello

world`;

    const md2 = `# title

hello

worlds`;

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });

  it("change: text at start", async () => {
    const md1 = `# new title

hello

world`;

    const md2 = `# title

hello

world`;

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });

  it("change: text at middle", async () => {
    const md1 = `# title

hello

world`;

    const md2 = `# title

hello there,

world`;

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });

  it("mixed: change and insert", async () => {
    const md1 = `# title

hello

world`;

    const md2 = `# title

hello there

beautiful

wold`;

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });

  it("lists: remove list item", async () => {
    const md1 = `# title

- hello
- world`;

    const md2 = `# title

- hello`;

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });

  it("lists: add list item", async () => {
    const md1 = `# title

- hello`;

    const md2 = `# title

- hello
- world`;

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });

  it("lists: update list item", async () => {
    const md1 = `# title

- hello
- world`;

    const md2 = `# title

- hello there
- world`;

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });

  it("lists: add list", async () => {
    const md1 = `# title`;

    const md2 = `# title

- hello there
- world`;

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });

  it("lists: remove list", async () => {
    const md1 = `# title

- hello there
- world`;

    const md2 = `# title`;

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });

  it("3 lines -> large text", async () => {
    const md1 = `# title

hello

world`;

    const md2 =
      "# Document Title\n\nTest\n\nThis is the first sentence of the document. \n\n## Introduction\n\nThe introduction provides an overview of the document's purpose and structure. \n\n## Main Content\n\nThe main content section contains the bulk of the information. \n\n### Subsection 1\n\nDetails about the first subsection are provided here. \n\n### Subsection 2\n\nDetails about the second subsection are provided here. \n\n## Conclusion\n\nThe conclusion summarizes the key points discussed in the document. \n\n## References\n\nA list of references and resources used in the document.";

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });

  it("1 line -> large text", async () => {
    const md1 = `hello`;

    const md2 =
      "# Document Title\n\nTest\n\nThis is the first sentence of the document. \n\n## Introduction\n\nThe introduction provides an overview of the document's purpose and structure. \n\n## Main Content\n\nThe main content section contains the bulk of the information. \n\n### Subsection 1\n\nDetails about the first subsection are provided here. \n\n### Subsection 2\n\nDetails about the second subsection are provided here. \n\n## Conclusion\n\nThe conclusion summarizes the key points discussed in the document. \n\n## References\n\nA list of references and resources used in the document.";

    const operations = await markdownNodeDiff(md1, md2);
    const diff = await operationsToReadableString(operations);
    expect(diff).toMatchSnapshot();
  });
});
