import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createBlockSpec } from "../../../extensions/Blocks/api/block";
import {
  imagePropSchema,
  renderImage,
} from "../../../extensions/Blocks/nodes/BlockContent/ImageBlockContent/ImageBlockContent";
import { defaultBlockSchema } from "../../../extensions/Blocks/api/defaultBlocks";
import {
  BlockSchema,
  PartialBlock,
} from "../../../extensions/Blocks/api/blockTypes";
import { BlockNoteEditor } from "../../../BlockNoteEditor";
import { Editor } from "@tiptap/core";
import { uploadToTmpFilesDotOrg_DEV_ONLY } from "../../../extensions/Blocks/nodes/BlockContent/ImageBlockContent/uploadToTmpFilesDotOrg_DEV_ONLY";
import { createInternalHTMLSerializer } from "./internalHTMLSerializer";
import { createExternalHTMLExporter } from "./externalHTMLExporter";
import { defaultProps } from "../../../extensions/Blocks/api/defaultProps";
import { parseExternalHTML } from "./parseExternalHTML";

// This is a modified version of the default image block that does not implement
// a `serialize` function. It's used to test if the custom serializer by default
// serializes custom blocks using their `render` function.
const SimpleImage = createBlockSpec({
  type: "simpleImage",
  propSchema: imagePropSchema,
  containsInlineContent: false,
  render: renderImage as any,
});

const CustomParagraph = createBlockSpec({
  type: "customParagraph",
  propSchema: defaultProps,
  containsInlineContent: true,
  render: () => {
    const paragraph = document.createElement("p");
    paragraph.className = "custom-paragraph";

    return {
      dom: paragraph,
      contentDOM: paragraph,
    };
  },
  toExternalHTML: () => {
    const paragraph = document.createElement("p");
    paragraph.className = "custom-paragraph";
    paragraph.innerHTML = "Hello World";

    return {
      dom: paragraph,
    };
  },
});

const SimpleCustomParagraph = createBlockSpec({
  type: "simpleCustomParagraph",
  propSchema: defaultProps,
  containsInlineContent: true,
  render: () => {
    const paragraph = document.createElement("p");
    paragraph.className = "simple-custom-paragraph";

    return {
      dom: paragraph,
      contentDOM: paragraph,
    };
  },
});

const customSchema = {
  ...defaultBlockSchema,
  simpleImage: SimpleImage,
  customParagraph: CustomParagraph,
  simpleCustomParagraph: SimpleCustomParagraph,
} satisfies BlockSchema;

let editor: BlockNoteEditor<typeof customSchema>;
let tt: Editor;

beforeEach(() => {
  editor = new BlockNoteEditor({
    blockSchema: customSchema,
    uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
  });
  tt = editor._tiptapEditor;
});

afterEach(() => {
  tt.destroy();
  editor = undefined as any;
  tt = undefined as any;

  delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
});

function convertToHTMLAndCompareSnapshots(
  blocks: PartialBlock<typeof customSchema>[],
  snapshotDirectory: string,
  snapshotName: string
) {
  const serializer = createInternalHTMLSerializer(tt.schema, editor);
  const internalHTML = serializer.serializeBlocks(blocks);
  const internalHTMLSnapshotPath =
    "./__snapshots__/copy/" +
    snapshotDirectory +
    "/" +
    snapshotName +
    "/internal.html";
  expect(internalHTML).toMatchFileSnapshot(internalHTMLSnapshotPath);

  const exporter = createExternalHTMLExporter(tt.schema, editor);
  const externalHTML = exporter.exportBlocks(blocks);
  const externalHTMLSnapshotPath =
    "./__snapshots__/copy/" +
    snapshotDirectory +
    "/" +
    snapshotName +
    "/external.html";
  expect(externalHTML).toMatchFileSnapshot(externalHTMLSnapshotPath);
}

describe("Convert paragraphs to HTML", () => {
  it("Convert paragraph to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "paragraph",
        content: "Paragraph",
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "paragraph", "basic");
  });

  it("Convert styled paragraph to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "paragraph",
        props: {
          textAlignment: "center",
          textColor: "orange",
          backgroundColor: "pink",
        },
        content: [
          {
            type: "text",
            styles: {},
            text: "Plain ",
          },
          {
            type: "text",
            styles: {
              textColor: "red",
            },
            text: "Red Text ",
          },
          {
            type: "text",
            styles: {
              backgroundColor: "blue",
            },
            text: "Blue Background ",
          },
          {
            type: "text",
            styles: {
              textColor: "red",
              backgroundColor: "blue",
            },
            text: "Mixed Colors",
          },
        ],
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "paragraph", "styled");
  });

  it("Convert nested paragraph to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "paragraph",
        content: "Paragraph",
        children: [
          {
            type: "paragraph",
            content: "Nested Paragraph 1",
          },
          {
            type: "paragraph",
            content: "Nested Paragraph 2",
          },
        ],
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "paragraph", "nested");
  });
});

describe("Convert images to HTML", () => {
  it("Convert add image button to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "image",
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "image", "button");
  });

  it("Convert image to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "image",
        props: {
          url: "exampleURL",
          caption: "Caption",
          width: 256,
        },
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "image", "basic");
  });

  it("Convert nested image to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "image",
        props: {
          url: "exampleURL",
          caption: "Caption",
          width: 256,
        },
        children: [
          {
            type: "image",
            props: {
              url: "exampleURL",
              caption: "Caption",
              width: 256,
            },
          },
        ],
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "image", "nested");
  });
});

describe("Convert simple images to HTML", () => {
  it("Convert simple add image button to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "simpleImage",
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "simpleImage", "button");
  });

  it("Convert simple image to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "simpleImage",
        props: {
          url: "exampleURL",
          caption: "Caption",
          width: 256,
        },
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "simpleImage", "basic");
  });

  it("Convert nested image to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "simpleImage",
        props: {
          url: "exampleURL",
          caption: "Caption",
          width: 256,
        },
        children: [
          {
            type: "simpleImage",
            props: {
              url: "exampleURL",
              caption: "Caption",
              width: 256,
            },
          },
        ],
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "simpleImage", "nested");
  });
});

describe("Convert custom blocks with inline content to HTML", () => {
  it("Convert custom block with inline content to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "customParagraph",
        content: "Custom Paragraph",
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "customParagraph", "basic");
  });

  it("Convert styled custom block with inline content to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "customParagraph",
        props: {
          textAlignment: "center",
          textColor: "orange",
          backgroundColor: "pink",
        },
        content: [
          {
            type: "text",
            styles: {},
            text: "Plain ",
          },
          {
            type: "text",
            styles: {
              textColor: "red",
            },
            text: "Red Text ",
          },
          {
            type: "text",
            styles: {
              backgroundColor: "blue",
            },
            text: "Blue Background ",
          },
          {
            type: "text",
            styles: {
              textColor: "red",
              backgroundColor: "blue",
            },
            text: "Mixed Colors",
          },
        ],
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "customParagraph", "styled");
  });

  it("Convert nested block with inline content to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "customParagraph",
        content: "Custom Paragraph",
        children: [
          {
            type: "customParagraph",
            content: "Nested Custom Paragraph 1",
          },
          {
            type: "customParagraph",
            content: "Nested Custom Paragraph 2",
          },
        ],
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "customParagraph", "nested");
  });
});

describe("Convert custom blocks with non-exported inline content to HTML", () => {
  it("Convert custom block with non-exported inline content to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "simpleCustomParagraph",
        content: "Custom Paragraph",
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "simpleCustomParagraph", "basic");
  });

  it("Convert styled custom block with non-exported inline content to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "simpleCustomParagraph",
        props: {
          textAlignment: "center",
          textColor: "orange",
          backgroundColor: "pink",
        },
        content: [
          {
            type: "text",
            styles: {},
            text: "Plain ",
          },
          {
            type: "text",
            styles: {
              textColor: "red",
            },
            text: "Red Text ",
          },
          {
            type: "text",
            styles: {
              backgroundColor: "blue",
            },
            text: "Blue Background ",
          },
          {
            type: "text",
            styles: {
              textColor: "red",
              backgroundColor: "blue",
            },
            text: "Mixed Colors",
          },
        ],
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "simpleCustomParagraph", "styled");
  });

  it("Convert nested block with non-exported inline content to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "simpleCustomParagraph",
        content: "Custom Paragraph",
        children: [
          {
            type: "simpleCustomParagraph",
            content: "Nested Custom Paragraph 1",
          },
          {
            type: "simpleCustomParagraph",
            content: "Nested Custom Paragraph 2",
          },
        ],
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "simpleCustomParagraph", "nested");
  });
});

function parseHTMLAndCompareSnapshots(html: string, snapshotName: string) {
  const blocks = parseExternalHTML(html, editor);

  const snapshotPath = "./__snapshots__/paste/" + snapshotName + ".json";
  expect(JSON.stringify(blocks)).toMatchFileSnapshot(snapshotPath);
}

describe("Parse HTML", () => {
  it("Parse basic block types", async () => {
    const html = `<h1>Heading 1</h1>
<h2>Heading 2</h2>
<h3>Heading 3</h3>
<p>Paragraph</p>
<figure><img src="exampleURL"><figcaption>Image Caption</figcaption></figure>
<p>None <strong>Bold </strong><em>Italic </em><u>Underline </u><s>Strikethrough </s><strong><em><s><u>All</u></s></em></strong></p>`;

    parseHTMLAndCompareSnapshots(html, "parse-basic-block-types");
  });

  it("Parse nested lists", async () => {
    const html = `<ul>
   <li>
      Bullet List Item
      <ul>
         <li>
            Nested Bullet List Item
         </li>
         <li>
            Nested Bullet List Item
         </li>
      </ul>
   </li>
   <li>
      Bullet List Item
   </li>
</ul>
<ol>
   <li>
      Numbered List Item
      <ol>
         <li>
            Nested Numbered List Item
         </li>
         <li>
            Nested Numbered List Item
         </li>
      </ol>
   </li>
   <li>
      Numbered List Item
   </li>
</ol>`;

    parseHTMLAndCompareSnapshots(html, "parse-nested-lists");
  });

  it("Parse nested lists with paragraphs", async () => {
    const html = `<ul>
   <li>
      <p>Bullet List Item</p>
      <ul>
         <li>
            <p>Nested Bullet List Item</p>
         </li>
         <li>
            <p>Nested Bullet List Item</p>
         </li>
      </ul>
   </li>
   <li>
      <p>Bullet List Item</p>
   </li>
</ul>
<ol>
   <li>
      <p>Numbered List Item</p>
      <ol>
         <li>
            <p>Nested Numbered List Item</p>
         </li>
         <li>
            <p>Nested Numbered List Item</p>
         </li>
      </ol>
   </li>
   <li>
      <p>Numbered List Item</p>
   </li>
</ol>`;

    parseHTMLAndCompareSnapshots(html, "parse-nested-lists-with-paragraphs");
  });

  it("Parse mixed nested lists", async () => {
    const html = `<ul>
   <li>
      Bullet List Item
      <ol>
         <li>
            Nested Numbered List Item
         </li>
         <li>
            Nested Numbered List Item
         </li>
      </ol>
   </li>
   <li>
      Bullet List Item
   </li>
</ul>
<ol>
   <li>
      Numbered List Item
      <ul>
         <li>
            <p>Nested Bullet List Item</p>
         </li>
         <li>
            <p>Nested Bullet List Item</p>
         </li>
      </ul>
   </li>
   <li>
      Numbered List Item
   </li>
</ol>`;

    parseHTMLAndCompareSnapshots(html, "parse-mixed-nested-lists");
  });

  it("Parse divs", async () => {
    const html = `<div>Single Div</div>
<div>
  Div
  <div>Nested Div</div>
  <div>Nested Div</div>
</div>
<div>Single Div</div>
<div>
  <div>Nested Div</div>
  <div>Nested Div</div>
</div>`;

    parseHTMLAndCompareSnapshots(html, "parse-divs");
  });

  it("Parse fake image caption", async () => {
    const html = `<div>
  <img src="exampleURL">
  <p>Image Caption</p>
</div>`;

    parseHTMLAndCompareSnapshots(html, "parse-fake-image-caption");
  });

  it("Parse deep nested content", async () => {
    const html = `<div>
    Outer 1 Div Before
  <div>
    Outer 2 Div Before
    <div>
      Outer 3 Div Before
      <div>
        Outer 4 Div Before
        <h1>Heading 1</h1>
        <h2>Heading 2</h2>
        <h3>Heading 3</h3>
        <p>Paragraph</p>
        <figure><img src="exampleURL"><figcaption>Image Caption</figcaption></figure>
        <p><strong>Bold</strong> <em>Italic</em> <u>Underline</u> <s>Strikethrough</s> <strong><em><s><u>All</u></s></em></strong></p>
        Outer 4 Div After
      </div>
      Outer 3 Div After
    </div>
    Outer 2 Div After
  </div>
  Outer 1 Div After
</div>`;

    parseHTMLAndCompareSnapshots(html, "parse-deep-nested-content");
  });

  it("Parse div with inline content and nested blocks", async () => {
    const html = `<div>
  None <strong>Bold </strong><em>Italic </em><u>Underline </u><s>Strikethrough </s><strong><em><s><u>All</u></s></em></strong>
  <div>Nested Div</div>
  <p>Nested Paragraph</p>
</div>`;

    parseHTMLAndCompareSnapshots(html, "parse-div-with-inline-content");
  });
});
