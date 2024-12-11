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
});
