import { describe, expect, it } from "vitest";
import { BlockNoteEditor } from "../../..";

async function parseMarkdownAndCompareSnapshots(
  md: string,
  snapshotName: string
) {
  const editor = BlockNoteEditor.create();
  const blocks = await editor.tryParseMarkdownToBlocks(md);

  const snapshotPath = "./__snapshots__/" + snapshotName + ".json";
  expect(JSON.stringify(blocks, undefined, 2)).toMatchFileSnapshot(
    snapshotPath
  );
}

describe("Parse Markdown", () => {
  it("Convert non-nested Markdown to blocks", async () => {
    const markdown = `# Heading
  
Paragraph

*   Bullet List Item

1.  Numbered List Item
  `;
    await parseMarkdownAndCompareSnapshots(markdown, "non-nested");
  });

  // Failing due to nested block parsing bug.
  it("Convert nested Markdown to blocks", async () => {
    const markdown = `# Heading
  
Paragraph

*   Bullet List Item

    1.  Numbered List Item
`;
    await parseMarkdownAndCompareSnapshots(markdown, "nested");
  });

  it("Convert styled Markdown to blocks", async () => {
    const markdown = `**Bold** *Italic* ~~Strikethrough~~ ***Multiple***`;
    await parseMarkdownAndCompareSnapshots(markdown, "styled");
  });

  it("Convert complex Markdown to blocks", async () => {
    const markdown = `# Heading 1

## Heading 2

### Heading 3

Paragraph

P**ara***grap*h

P*ara*~~grap~~h

*   Bullet List Item

*   Bullet List Item

    *   Bullet List Item

        *   Bullet List Item

        Paragraph

        1.  Numbered List Item

        2.  Numbered List Item

        3.  Numbered List Item

            1.  Numbered List Item

        *   Bullet List Item

    *   Bullet List Item

*   Bullet List Item`;
    await parseMarkdownAndCompareSnapshots(markdown, "complex");
  });
});

describe("Issue 226", () => {
  it("Case 1", async () => {
    const markdown = `
- 📝 item1
- ⚙️ item2
- 🔗 item3

# h1
`;
    await parseMarkdownAndCompareSnapshots(markdown, "issue-226-1");
  });

  it("Case 2", async () => {
    const markdown = `* a
* b
* c
* d

anything

[a link](http://example.com)

* another
* list`;
    await parseMarkdownAndCompareSnapshots(markdown, "issue-226-2");
  });
});
