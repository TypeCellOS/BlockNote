import { ParseTestCase } from "../../../shared/formatConversion/parse/parseTestCase.js";
import {
  testParseHTML,
  testParseMarkdown,
} from "../../../shared/formatConversion/parse/parseTestExecutors.js";
import { TestInstance } from "../../../types.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";

export const parseTestInstancesHTML: TestInstance<
  ParseTestCase,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = [
  {
    testCase: {
      name: "basicBlockTypes",
      content: `<h1>Heading 1</h1>
<h2>Heading 2</h2>
<h3>Heading 3</h3>
<p>Paragraph</p>
<figure><img src="exampleURL" /><figcaption>Image Caption</figcaption></figure>
<p>None <strong>Bold </strong><em>Italic </em><u>Underline </u><s>Strikethrough </s><strong><em><s><u>All</u></s></em></strong></p>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "lists",
      content: `<ul>
<li>First</li>
<li>Second</li>
<li>Third</li>
<li>
  <input type="checkbox">
  Fourth
</li>
<li>
  <input type="checkbox">
  Fifth
</li>
<li>Five Parent
  <ul>
    <li>Child 1</li>
    <li>Child 2</li>
    <li>
      <input type="checkbox">
      Child 3
    </li>
    <li>
      <input type="checkbox">
      Child 4
    </li>
  </ul>
</li>
</ul>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "nestedLists",
      content: `<ul>
  <li>Bullet List Item</li>
  <li>Bullet List Item
    <ul>
      <li>Nested Bullet List Item</li>
      <li>Nested Bullet List Item</li>
    </ul>
  </li>
  <li>Bullet List Item</li>
</ul>
<ol>
  <li>Numbered List Item</li>
  <li>Numbered List Item
    <ol>
      <li>Nested Numbered List Item</li>
      <li>Nested Numbered List Item</li>
    </ol>
  </li>
  <li>Numbered List Item</li>
</ol>
<ul>
  <li>
    <input type="checkbox">
    Check List Item
  </li>
  <li>
    <input type="checkbox">
    Check List Item
    <ul>
      <li>
        <input type="checkbox">
        Nested Check List Item
      </li>
      <li>
        <input type="checkbox">
        Nested Check List Item
      </li>
    </ul>
  </li>
  <li>
    <input type="checkbox">
    Nested Check List Item
  </li>
</ul>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "nestedListsWithParagraphs",
      content: `<ul>
  <li>
    <p>Bullet List Item</p>
  </li>
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
  </li>
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
</ol>
<ul>
  <li>
    <input type="checkbox">
    <p>Checked List Item</p>
  </li>
  <li>
    <input type="checkbox">
    <p>Checked List Item</p>
    <ul>
      <li>
        <input type="checkbox">
        <p>Nested Checked List Item</p>
      </li>
      <li>
        <label><input type="checkbox"></label>
        <p>Nested Checked List Item</p>
      </li>
    </ul>
  </li>
  <li>
    <input type="checkbox">
    <p>Checked List Item</p>
  </li>
</ul>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "mixedNestedLists",
      content: `<ul>
  <li>Bullet List Item</li>
  <li>Bullet List Item
    <ol>
      <li>Nested Numbered List Item</li>
      <li>Nested Numbered List Item</li>
    </ol>
  </li>
  <li>Bullet List Item</li>
</ul>
<ol>
  <li>Numbered List Item</li>
  <li>Numbered List Item
    <ul>
      <li>
        <input type="checkbox" checked>
        Nested Check List Item
      </li>
      <li>
        <input type="checkbox">
        Nested Check List Item
      </li>
    </ul>
  </li>
  <li>Numbered List Item</li>
</ol>
<ul>
  <li>
    <input type="checkbox" checked>
    Check List Item
  </li>
  <li>
    <input type="checkbox">
    Check List Item
    <ul>
      <li>Nested Bullet List Item</li>
      <li>Nested Bullet List Item</li>
    </ul>
  </li>
  <li>
    <input type="checkbox" checked>
    Nested Check List Item
  </li>
</ul>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "divs",
      content: `<div>Single Div</div>
<div>
  Div
  <div>Nested Div</div>
  <div>Nested Div</div>
</div>
<div>Single Div 2</div>
<div>
  <div>Nested Div</div>
  <div>Nested Div</div>
</div>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "twoDivs",
      content: `<div>Single Div</div><div>second Div</div>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "imageInParagraph",
      content: `<p>
  <img src="exampleURL">
</p>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "fakeImageCaption",
      content: `<div>
  <img src="exampleURL">
  <p>Image Caption</p>
</div>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "deepNestedContent",
      content: `<div>
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
</div>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "inlineContentAndNestedBlocks",
      content: `<div>
  None <strong>Bold </strong><em>Italic </em><u>Underline </u><s>Strikethrough </s><strong><em><s><u>All</u></s></em></strong>
  <div>Nested Div</div>
  <p>Nested Paragraph</p>
</div>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "twoTables",
      content: `<table style="border-collapse:collapse;margin-left:255.478pt" cellspacing="0">
  <tr style="height:22pt">
    <td style="width:203pt">
      <p data-text-alignment="left" data-text-indent="0pt"><u>Company</u></p>
    </td>
  </tr>
  <tr style="height:86pt">
    <td style="width:203pt">
      <p data-text-alignment="left" data-text-indent="0pt"><b>Example Company Inc.</b></p>
      <p data-text-alignment="left" data-text-indent="0pt">
        <p>Name: [Company Representative]</p>
      </p>
      <p data-text-alignment="left" data-text-indent="0pt">Title: Chief Executive Officer</p>
    </td>
  </tr>
</table>

<table style="border-collapse:collapse;margin-left:256.5pt" cellspacing="0">
  <tr style="height:58pt">
    <td style="width:209pt;border-bottom-style:solid;border-bottom-width:2pt">
      <p data-text-alignment="left" data-text-indent="0pt"><u>Advisor</u></p>
    </td>
  </tr>
  <tr style="height:13pt">
    <td style="width:209pt;border-top-style:solid;border-top-width:2pt">
      <p data-text-alignment="left" data-text-indent="0pt">[Advisor Name]</p>
    </td>
  </tr>
</table>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "orderedListStart",
      content: `<ol start="2">
      <li>List Item 2</li>
      <li>List Item 3</li>
      <li>List Item 4</li>
  </ol>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "imageWidth",
      content: `<img src="exampleURL" width="100">`,
    },
    executeTest: testParseHTML,
  },
  // {
  //   testCase: {
  //     name: "textAlignmentProp",
  //     content: `<p style="text-align: center">Text Align Center</p>`,
  //   },
  //   executeTest: testParseHTML,
  // },
  // {
  //   testCase: {
  //     name: "textColorProp",
  //     content: `<p style="color: red">Red Paragraph</p>
  // <p style="color: green">Green Paragraph</p>
  // <p style="color: blue">Blue Paragraph</p>`,
  //   },
  //   executeTest: testParseHTML,
  // },
  // {
  //   testCase: {
  //     name: "backgroundColorProp",
  //     content: `<p style="background-color: red">Red Background</p>
  // <p style="background-color: green">Green Background</p>
  // <p style="background-color: blue">Blue Background</p>`,
  //   },
  //   executeTest: testParseHTML,
  // },
];

export const parseTestInstancesMarkdown: TestInstance<
  ParseTestCase,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = [
  {
    testCase: {
      name: "basic",
      content: `# Heading
  
Paragraph

*   Bullet List Item

1.  Numbered List Item
`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "nested",
      content: `# Heading
  
Paragraph

*   Bullet List Item

    1.  Numbered List Item
`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "styled",
      content: `**Bold** *Italic* ~~Strikethrough~~ ***Multiple***`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "complex",
      content: `# Heading 1

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

*   Bullet List Item`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "boldWithWhitespace",
      content: `hello **beautiful ** world`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "issue226case1",
      content: `
- 📝 item1
- ⚙️ item2
- 🔗 item3

# h1
`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "issue226case2",
      content: `* a
* b
* c
* d

anything

[a link](http://example.com)

* another
* list`,
    },
    executeTest: testParseMarkdown,
  },
];
