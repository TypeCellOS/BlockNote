import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vitest";
import { markdownNodeDiff } from "./markdownNodeDiff.js";
import { markdownNodeDiffToBlockOperations } from "./markdownOperations.js";

describe("markdownNodeDiffToBlockOperations", () => {
  it("add sentence at start", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "paragraph",
          content: "hello",
        },
      ],
    });

    const diff = await markdownNodeDiff(
      await editor.blocksToMarkdownLossy(),
      "test\n\nhello"
    );
    const update = await markdownNodeDiffToBlockOperations(
      editor,
      editor.document,
      diff
    );

    expect(update).toMatchSnapshot();
  });

  it("add word at end of sentence", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "paragraph",
          content: "hello",
        },
      ],
    });

    const diff = await markdownNodeDiff(
      await editor.blocksToMarkdownLossy(),
      "hello world"
    );
    const update = await markdownNodeDiffToBlockOperations(
      editor,
      editor.document,
      diff
    );

    expect(update).toMatchSnapshot();
  });

  it("change type", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "paragraph",
          content: "hello",
        },
      ],
    });

    const diff = await markdownNodeDiff(
      await editor.blocksToMarkdownLossy(),
      "# hello"
    );
    const update = await markdownNodeDiffToBlockOperations(
      editor,
      editor.document,
      diff
    );

    expect(update).toMatchSnapshot();
  });

  it("complex change 1", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "heading",
          content: "hello there",
        },
        {
          type: "paragraph",
          content: "beautiful",
        },
        {
          type: "paragraph",
          content: "world",
        },
      ],
    });

    const diff = await markdownNodeDiff(
      await editor.blocksToMarkdownLossy(),
      `prefix

## hello

world`
    );
    const update = await markdownNodeDiffToBlockOperations(
      editor,
      editor.document,
      diff
    );

    expect(update).toMatchSnapshot();
  });

  it("complex change 2", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "heading",
          content: "hello there",
        },
        {
          type: "paragraph",
          content: "beautiful",
        },
        {
          type: "paragraph",
          content: "world",
        },
      ],
    });

    const diff = await markdownNodeDiff(
      // note that the indentation will actually create a code block from the last two paragraphs
      await editor.blocksToMarkdownLossy(),
      `prefix

    ## hello

    world`
    );
    const update = await markdownNodeDiffToBlockOperations(
      editor,
      editor.document,
      diff
    );

    expect(update).toMatchSnapshot();
  });

  it("large change", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "paragraph",
          content: "hello",
        },
      ],
    });

    const diff = await markdownNodeDiff(
      await editor.blocksToMarkdownLossy(),
      "# Document Title\n\nTest\n\nThis is the first sentence of the document. \n\n## Introduction\n\nThe introduction provides an overview of the document's purpose and structure. \n\n## Main Content\n\nThe main content section contains the bulk of the information. \n\n### Subsection 1\n\nDetails about the first subsection are provided here. \n\n### Subsection 2\n\nDetails about the second subsection are provided here. \n\n## Conclusion\n\nThe conclusion summarizes the key points discussed in the document. \n\n## References\n\nA list of references and resources used in the document."
    );
    const update = await markdownNodeDiffToBlockOperations(
      editor,
      editor.document,
      diff
    );

    expect(update).toMatchSnapshot();
  });

  // TODO: this still breaks
  it.skip("fake list", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "paragraph",
          content: "hello\n- test\n- test2",
        },
      ],
    });

    const diff = await markdownNodeDiff(
      await editor.blocksToMarkdownLossy(),
      "hello world"
    );
    const update = await markdownNodeDiffToBlockOperations(
      editor,
      editor.document,
      diff
    );

    expect(update).toMatchSnapshot();
  });

  it("one empty paragraph", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "paragraph",
          content: "hello",
        },
        {
          type: "paragraph",
          content: "",
        },
        {
          type: "paragraph",
          content: "there",
        },
      ],
    });

    const diff = await markdownNodeDiff(
      await editor.blocksToMarkdownLossy(),
      "hello world"
    );
    const update = await markdownNodeDiffToBlockOperations(
      editor,
      editor.document,
      diff
    );

    expect(update).toMatchSnapshot();
  });

  it("two empty paragraphs", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "paragraph",
          content: "hello",
        },
        {
          type: "paragraph",
          content: "",
        },
        {
          type: "paragraph",
          content: "",
        },
        {
          type: "paragraph",
          content: "there",
        },
      ],
    });

    const diff = await markdownNodeDiff(
      await editor.blocksToMarkdownLossy(),
      "hello world"
    );
    const update = await markdownNodeDiffToBlockOperations(
      editor,
      editor.document,
      diff
    );

    expect(update).toMatchSnapshot();
  });

  it("empty paragraph and table", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "paragraph",
          content: "hello",
        },
        {
          type: "paragraph",
          content: "",
        },
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: ["test", "test2"],
              },
            ],
          },
        },
      ],
    });

    const diff = await markdownNodeDiff(
      await editor.blocksToMarkdownLossy(),
      "**A Call to Action: Empowering Europe's Public Agents with an Open-Source Alternative to Notion**\n\nDear President Ursula Von der Leyen,\n\nAs the European Union continues to strive for innovation and digital transformation, I strongly believe that creating an open-source alternative to Notion for public agents is a crucial step forward. This initiative would not only enhance the productivity and collaboration of our public servants but also ensure the sovereignty and security of our data.\n\nBy developing an open-source platform, we can guarantee that our public agents' data remains within the EU's borders, protected by our stringent data protection laws. This would alleviate concerns about data privacy and security, allowing our agents to focus on their critical work without worrying about the risks associated with proprietary software.\n\nMoreover, an open-source platform would foster a culture of collaboration and transparency. Public agents from different member states could work together seamlessly, sharing knowledge and best practices to drive progress and innovation. This would be particularly beneficial in areas such as policy-making, research, and crisis management, where collaboration is essential.\n\nFurthermore, an open-source alternative to Notion would be a powerful symbol of the EU's commitment to digital sovereignty and its determination to shape the future of technology. By taking control of our digital tools, we can ensure that our values and principles are reflected in the software we use.\n\nI urge you to consider the benefits of creating an open-source alternative to Notion for Europe's public agents. Together, we can empower our public servants, enhance collaboration, and drive innovation while protecting our data and promoting digital sovereignty.\n\nSincerely, [Your Name]\n\n|                              |            |                             |\n| ---------------------------- | ---------- | --------------------------- |\n|                              | Notion     | Open source                 |\n| Cost                         | 30€/cs     | 1€/cs                       |\n| People in-house              | 0          | 5 developers (100k€ a year) |\n| Number of civil servant (cs) | 36 million | 36 million                  |\n\n**Summary of Costs and Benefits**\n\nThe proposed open-source alternative to Notion would significantly reduce costs, from 30€ per civil servant to 1€ per civil servant, while also creating in-house jobs for 5 developers. This initiative would not only save the EU a substantial amount of money but also promote digital sovereignty and enhance collaboration among public agents.\n\n**Summary**\n\nIn conclusion, creating an open-source alternative to Notion for Europe's public agents is a crucial step towards digital transformation, data sovereignty, and enhanced collaboration. With significant cost savings and the creation of in-house jobs, this initiative has the potential to drive innovation and progress in the EU while protecting our values and principles."
    );
    const update = await markdownNodeDiffToBlockOperations(
      editor,
      editor.document,
      diff
    );

    expect(update).toMatchSnapshot();
  });
});

// investigate streaming
// inline content etc
// add tests for nesting
// add tests for lists
// add tests for tables
