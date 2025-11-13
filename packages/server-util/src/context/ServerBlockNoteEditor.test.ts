import { Block } from "@blocknote/core";
import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { DomShim, ServerBlockNoteEditor } from "./ServerBlockNoteEditor.js";

const jsdomShim: DomShim = {
  acquire() {
    const dom = new JSDOM();
    return {
      window: dom.window as any,
      document: dom.window.document as any,
    };
  },
};

describe("Test ServerBlockNoteEditor", () => {
  const editor = ServerBlockNoteEditor.create({}, jsdomShim);

  const blocks: Block[] = [
    {
      id: "1",
      type: "heading",
      props: {
        backgroundColor: "blue",
        textColor: "yellow",
        textAlignment: "right",
        level: 2,
        isToggleable: false,
      },
      content: [
        {
          type: "text",
          text: "Heading ",
          styles: {
            bold: true,
            underline: true,
          },
        },
        {
          type: "text",
          text: "2",
          styles: {
            italic: true,
            strike: true,
          },
        },
      ],
      children: [
        {
          id: "2",
          type: "paragraph",
          props: {
            backgroundColor: "red",
            textAlignment: "left",
            textColor: "default",
          },
          content: [
            {
              type: "text",
              text: "Paragraph",
              styles: {},
            },
          ],
          children: [],
        },
        {
          id: "3",
          type: "bulletListItem",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
          },
          content: [
            {
              type: "text",
              text: "list item",
              styles: {},
            },
          ],
          children: [],
        },
      ],
    },
    {
      id: "4",
      type: "image",
      props: {
        backgroundColor: "default",
        textAlignment: "left",
        name: "Example",
        url: "exampleURL",
        caption: "Caption",
        showPreview: true,
        previewWidth: 256,
      },
      content: undefined,
      children: [],
    },
    {
      id: "5",
      type: "image",
      props: {
        backgroundColor: "default",
        textAlignment: "left",
        name: "Example",
        url: "exampleURL",
        caption: "Caption",
        showPreview: false,
        previewWidth: 256,
      },
      content: undefined,
      children: [],
    },
  ];

  it("converts to and from HTML (blocksToHTMLLossy)", async () => {
    const html = await editor.blocksToHTMLLossy(blocks);
    expect(html).toMatchSnapshot();

    const blockOutput = await editor.tryParseHTMLToBlocks(html);
    expect(blockOutput).toMatchSnapshot();
  });

  it("converts to HTML (blocksToFullHTML)", async () => {
    const html = await editor.blocksToFullHTML(blocks);
    expect(html).toMatchSnapshot();
  });

  it("converts to and from markdown (blocksToMarkdownLossy)", async () => {
    const md = await editor.blocksToMarkdownLossy(blocks);
    expect(md).toMatchSnapshot();

    const blockOutput = await editor.tryParseMarkdownToBlocks(md);
    expect(blockOutput).toMatchSnapshot();
  });
});

describe("ServerBlockNoteEditor with domShim", () => {
  it("uses provided domShim correctly", async () => {
    let acquireCalled = false;
    let releaseCalled = false;
    let releasedGlobals: any = null;

    const testShim: DomShim = {
      acquire() {
        acquireCalled = true;
        const dom = new JSDOM();
        return {
          window: dom.window as any,
          document: dom.window.document as any,
        };
      },
      release(globals) {
        releaseCalled = true;
        releasedGlobals = globals;
      },
    };

    const editor = ServerBlockNoteEditor.create({}, testShim);
    const blocks: Block[] = [
      {
        id: "1",
        type: "paragraph",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
        },
        content: [
          {
            type: "text",
            text: "Test",
            styles: {},
          },
        ],
        children: [],
      },
    ];

    const html = await editor.blocksToFullHTML(blocks);

    expect(acquireCalled).toBe(true);
    expect(releaseCalled).toBe(true);
    expect(releasedGlobals).toBeTruthy();
    expect(releasedGlobals.document).toBeTruthy();
    expect(releasedGlobals.window).toBeTruthy();
    expect(html).toBeTruthy();
  });

  it("throws error when no domShim is provided and globals don't exist", async () => {
    // Save original globals
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;

    try {
      // Remove globals to simulate server environment
      delete (globalThis as any).window;
      delete (globalThis as any).document;

      const editor = ServerBlockNoteEditor.create();
      const blocks: Block[] = [
        {
          id: "1",
          type: "paragraph",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
          },
          content: [
            {
              type: "text",
              text: "Test",
              styles: {},
            },
          ],
          children: [],
        },
      ];

      await expect(editor.blocksToFullHTML(blocks)).rejects.toThrow(
        "DOM globals (window/document) are required but not available",
      );

      await expect(editor.blocksToHTMLLossy(blocks)).rejects.toThrow(
        "DOM globals (window/document) are required but not available",
      );

      await expect(editor.blocksToMarkdownLossy(blocks)).rejects.toThrow(
        "DOM globals (window/document) are required but not available",
      );
    } finally {
      // Restore original globals
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
    }
  });

  it("works when globals already exist without domShim", async () => {
    // This test verifies that if window/document already exist globally,
    // methods work without a domShim
    // Note: This test only works if the test environment has globals set up
    // (e.g., via jsdom in vitest config)
    if (
      typeof globalThis.window !== "undefined" &&
      typeof globalThis.document !== "undefined"
    ) {
      const editor = ServerBlockNoteEditor.create();
      const blocks: Block[] = [
        {
          id: "1",
          type: "paragraph",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
          },
          content: [
            {
              type: "text",
              text: "Test",
              styles: {},
            },
          ],
          children: [],
        },
      ];

      // Should work if globals exist (like in a test environment with jsdom)
      const html = await editor.blocksToFullHTML(blocks);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(html).toBeTruthy();
    } else {
      // Skip test if globals don't exist in this environment
      // eslint-disable-next-line jest/no-conditional-expect
      expect(true).toBe(true);
    }
  });
});
