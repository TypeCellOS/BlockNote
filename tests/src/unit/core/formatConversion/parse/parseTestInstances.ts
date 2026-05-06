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
<h4>Heading 4</h4>
<h5>Heading 5</h5>
<h6>Heading 6</h6>
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
    // TODO this test's result not exactly right, but it's close enough for now.
    testCase: {
      name: "emptyNestedCheckListItem",
      content: `<ul>
  <li>
    <ul>
      <li>
        <input type="checkbox" />
      </li>
    </ul>
    <p>Paragraph</p>
  </li>
  </ul>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "checkListItem",
      content: `<ul>
  <li>
    <input type="checkbox">
    <p>Paragraph</p>
  <li>
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
      name: "multipleParagraphListItem",
      content: `<ul>
  <li>
    <p>Bullet List Item</p>
    <p>Bullet List Item</p>
  </li>
  <li>Bullet List Item</li>
</ul>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "textWithImageListItem",
      content: `<ul>
  <li>
    Bullet List Item
    <img src="exampleURL">
  </li>
  <li>Bullet List Item</li>
</ul>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "paragraphWithImageListItem",
      content: `<ul>
  <li>
    <p>Bullet List Item</p>
    <img src="exampleURL">
  </li>
  <li>Bullet List Item</li>
</ul>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "imageWithTextListItem",
      content: `<ul>
  <li>
    <img src="exampleURL">
    Bullet List Item
  </li>
  <li>Bullet List Item</li>
</ul>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "imageWithParagraphListItem",
      content: `<ul>
  <li>
    <img src="exampleURL">
    <p>Bullet List Item</p>
  </li>
  <li>Bullet List Item</li>
</ul>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "styledTextListItem",
      content: `<ul>
  <li>Bullet List Item <b>Bold</b></li>
  <li>Bullet List Item</li>
</ul>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "styledTextWithImageListItem",
      content: `<ul>
  <li>
    <b>Bold</b> Bullet List Item
    <img src="exampleURL">
  </li>
  <li>Bullet List Item</li>
</ul>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "flattenedListItem",
      content: `<ul>
  <li>
    <ol>
      <li>Nested Numbered List Item</li>
    </ol>
  </li>
  <li>Bullet List Item</li>
</ul>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "headingParagraphListItem",
      content: `<ul>
  <li>
    <h1>Bullet List Item</h1>
    <p>Bullet List Item</p>
  </li>
  <li>Bullet List Item</li>
</ul>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "paragraphHeadingListItem",
      content: `<ul>
  <li>
    <p>Bullet List Item</p>
    <h1>Bullet List Item</h1>
  </li>
  <li>Bullet List Item</li>
</ul>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "textTableCell",
      content: `<table>
  <tbody>
    <tr>
      <td>Table Cell</td>
    </tr>  
  </tbody>
</table>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "paragraphTableCell",
      content: `<table>
  <tbody>
    <tr>
      <td>
        <p>Table Cell</p>
      </td>
    </tr>  
  </tbody>
</table>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "headingTableCell",
      content: `<table>
  <tbody>
    <tr>
      <td>
        <h1>Table Cell</h1>
      </td>
    </tr>  
  </tbody>
</table>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "multipleParagraphTableCell",
      content: `<table>
  <tbody>
    <tr>
      <td>
        <p>Table Cell</p>
        <p>Table Cell</p>
      </td>
    </tr>  
  </tbody>
</table>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "mixedTextTableCell",
      content: `<table>
  <tbody>
    <tr>
      <td>
        <h1>Table Cell</p>
        <p>Table Cell</p>
        Table Cell
      </td>
    </tr>  
  </tbody>
</table>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "paragraphImageTableCell",
      content: `<table>
  <tbody>
    <tr>
      <td>
        <p>Table Cell</p>
        <img src="exampleURL">
      </td>
    </tr>  
  </tbody>
</table>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "imageBetweenParagraphsTableCell",
      content: `<table>
  <tbody>
    <tr>
      <td>
        <p>Table Cell</p>
        <img src="exampleURL">
        <p>Table Cell</p>
      </td>
    </tr>  
  </tbody>
</table>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "mixedContentTableCell",
      content: `<table>
  <tbody>
    <tr>
      <td>
        <p>Table Cell</p>
        <img src="exampleURL">
        Table Cell
        <br/>
        <input type="checkbox">
        <h1>Table Cell</h1>
        <ul>
          <li>Table Cell</li>
          <li>Table Cell</li>
        </ul>
      </td>
    </tr>  
  </tbody>
</table>`,
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
        <h4>Heading 4</h4>
        <h5>Heading 5</h5>
        <h6>Heading 6</h6>
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
      name: "notion",
      content: `<meta charset='utf-8'><h1>Heading 1</h1>
<h2>Heading 2</h2>
<h3>Heading 3</h3>
<h4>Heading 4</h4>
<h5>Heading 5</h5>
<h6>Heading 6</h6>
<p>Paragraph 1</p>
<p>Nested Paragraph 1</p>
<p>Nested Paragraph 2</p>
<p>Paragraph
With Hard Break</p>
<p><strong>Bold</strong> <em>Italic</em> Underline <s>Strikethrough</s> <em><strong><s>All</s></strong></em></p>
<ul>
<li>Bullet List Item 1
<ul>
<li>Nested Bullet List Item 1
<ol>
<li>Nested Numbered List Item 1</li>
<li>Nested Numbered List Item 2</li>
</ol>
</li>
<li>Nested Bullet List Item 2</li>
</ul>
</li>
<li>Bullet List Item 2</li>
</ul>
<ol>
<li>Numbered List Item 1</li>
<li>Numbered List Item 2</li>
</ol>
<p>Background Color Paragraph</p>
<p>!<a href="https://placehold.co/800x540.png">https://placehold.co/800x540.png</a></p>
<table>
<thead>
<tr>
<th>Cell 1</th>
<th>Cell 2</th>
<th>Cell 3</th>
</tr>
</thead>
<tbody>
<tr>
<td>Cell 4</td>
<td>Cell 5</td>
<td>Cell 6</td>
</tr>
<tr>
<td>Cell 7</td>
<td>Cell 8</td>
<td>Cell 9</td>
</tr>
</tbody>
</table>
<p>Paragraph</p>
<!-- notionvc: 7cb7968f-b969-4795-af7a-d41b5481c675 -->`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "googleDocs",
      content: `<meta charset='utf-8'>
<meta charset="utf-8">
<b style="font-weight:normal;" id="docs-internal-guid-fdf86189-7fff-f50a-2bef-c048469db8a9">
<h1 dir="ltr" style="line-height:1.38;margin-left: 18pt;text-indent: -18pt;margin-top:24pt;margin-bottom:6pt;padding:0pt 0pt 0pt 18pt;"><span style="font-size:23pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Heading 1</span></h1>
<h2 dir="ltr" style="line-height:1.38;margin-left: 18pt;text-indent: -18pt;margin-top:18pt;margin-bottom:4pt;padding:0pt 0pt 0pt 18pt;"><span style="font-size:17pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Heading 2</span></h2>
<h3 dir="ltr" style="line-height:1.38;margin-left: 18pt;text-indent: -18pt;margin-top:14pt;margin-bottom:4pt;padding:0pt 0pt 0pt 18pt;"><span style="font-size:13pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Heading 3</span></h3>
<h4 dir="ltr" style="line-height:1.38;margin-left: 18pt;text-indent: -18pt;margin-top:14pt;margin-bottom:4pt;padding:0pt 0pt 0pt 18pt;"><span style="font-size:13pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Heading 4</span></h4>
<h5 dir="ltr" style="line-height:1.38;margin-left: 18pt;text-indent: -18pt;margin-top:14pt;margin-bottom:4pt;padding:0pt 0pt 0pt 18pt;"><span style="font-size:13pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Heading 5</span></h5>
<h6 dir="ltr" style="line-height:1.38;margin-left: 18pt;text-indent: -18pt;margin-top:14pt;margin-bottom:4pt;padding:0pt 0pt 0pt 18pt;"><span style="font-size:13pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Heading 6</span></h6>
<p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:12pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Paragraph 1</span></p>
<p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:12pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Paragraph 2</span></p>
<p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:12pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Paragraph 3</span></p>
<p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:12pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Paragraph With </span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><br /></span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Hard Break</span></p>
<p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:12pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Bold</span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> </span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Italic</span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> Underline </span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:line-through;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Strikethrough</span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> </span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#ff0000;background-color:transparent;font-weight:700;font-style:italic;font-variant:normal;text-decoration:line-through;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">All</span></p>
<ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;">
<li dir="ltr" style="list-style-type:disc;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1">
<p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Bullet List Item 1</span></p>
</li>
<ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;">
<li dir="ltr" style="list-style-type:circle;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="2">
<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Nested Bullet List Item 1</span></p>
</li>
<ol style="margin-top:0;margin-bottom:0;padding-inline-start:48px;">
<li dir="ltr" style="list-style-type:decimal;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="3">
<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Nested Numbered List Item 1</span></p>
</li>
<li dir="ltr" style="list-style-type:decimal;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="3">
<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Nested Numbered List Item 2</span></p>
</li>
</ol>
<li dir="ltr" style="list-style-type:circle;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="2">
<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Nested Bullet List Item 2</span></p>
</li>
</ul>
<li dir="ltr" style="list-style-type:disc;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1">
<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Bullet List Item 2</span></p>
</li>
</ul>
<ol style="margin-top:0;margin-bottom:0;padding-inline-start:48px;">
<li dir="ltr" style="list-style-type:decimal;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1">
<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Numbered List Item 1</span></p>
</li>
<li dir="ltr" style="list-style-type:decimal;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1">
<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:12pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Numbered List Item 2</span></p>
</li>
</ol>
<p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:12pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span style="border:none;display:inline-block;overflow:hidden;width:447px;height:301px;"><img src="https://lh7-us.googleusercontent.com/SGyYp6hfLvNkli62NKFJB6NQz-fNa2Sjy8QxfUuqipW--qCCXmCz-dJmeZUGaDXIF9TEZHzbhNJsw4_w-B09eaFOn0oUChKsrSt3cwAIFu6d4SoSjHTR_DRTPr415_P7an7Lue-EwlUcVBk1WCzcoVQ" width="447" height="301" style="margin-left:0px;margin-top:0px;" /></span></span></p>
<br />
<div dir="ltr" style="margin-left:0pt;" align="left">
<table style="border:none;border-collapse:collapse;table-layout:fixed;width:468pt">
<colgroup>
<col />
<col />
<col />
</colgroup>
<tbody>
<tr style="height:0pt">
<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">
<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 1</span></p>
</td>
<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">
<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 2</span></p>
</td>
<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">
<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 3</span></p>
</td>
</tr>
<tr style="height:0pt">
<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">
<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 4</span></p>
</td>
<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">
<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 5</span></p>
</td>
<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">
<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 6</span></p>
</td>
</tr>
<tr style="height:0pt">
<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">
<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 7</span></p>
</td>
<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">
<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 8</span></p>
</td>
<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">
<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 9</span></p>
</td>
</tr>
</tbody>
</table>
</div>
<p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:12pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Paragraph</span></p>
</b>
<br class="Apple-interchange-newline">`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "codeBlocks",
      content: `<pre><code>console.log("Should default to JS")</code></pre>
<pre><code data-language="typescript">console.log("Should parse TS from data-language")</code></pre>
<pre><code class="language-python">print("Should parse Python from language- class")</code></pre>
<pre><code class="language-ruby" data-language="typescript">console.log("Should prioritize TS from data-language over language- class")</code></pre>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "codeBlocksMultiLine",
      content: `<pre><code>console.log("First Line")
console.log("Second Line")
console.log("Third Line")</code></pre>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "basicBlockquote",
      content: `<blockquote>This is a blockquote</blockquote>
<p>This is not a blockquote</p>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "twoBlockquotes",
      content: `<blockquote>First quote</blockquote>
<blockquote>Second quote</blockquote>
<p>Regular paragraph</p>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "inlineContentInBlockquote",
      content: `<blockquote><strong>Bold</strong> <em>Italic</em> <s>Strikethrough</s> <strong><em>Multiple</em></strong></blockquote>
<p>Regular paragraph</p>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "boldStyle",
      content: `<p><strong>Bold</strong> <b>Bold</b> <span style="font-weight: bold">Bold</span></p>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "italicStyle",
      content: `<p><em>Italic</em> <i>Italic</i> <span style="font-style: italic">Italic</span></p>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "underlineStyle",
      content: `<p><u>Underline</u> <span style="text-decoration: underline">Underline</span></p>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "strikeStyle",
      content: `<p><s>Strike</s> <del>Strike</del> <strike>Strike</strike> <span style="text-decoration: line-through">Strike</span></p>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "textColorStyle",
      content: `<p><span style="color: blue">Blue Text</span> <span data-style-type="textColor" data-value="blue">Blue Text</span></p>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "backgroundColorStyle",
      content: `<p><span style="background-color: blue">Blue Background</span> <span data-style-type="backgroundColor" data-value="blue">Blue Background</span></p>`,
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
  {
    testCase: {
      name: "textAlignmentProp",
      content: `<p style="text-align: center">Text Align Center</p>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "textColorProp",
      content: `<p style="color: blue">Blue Text</p>
  <p data-text-color="blue">Blue Text</p>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "backgroundColorProp",
      content: `<p style="background-color: blue">Blue Background</p>
  <p data-background-color="blue">Blue Background</p>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: { name: "divider", content: `<hr/>` },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "toggleListItem",
      content: `<ul>
  <li>
    <details open="">
      <summary><p>Toggle Item</p></summary>
    </details>
  </li>
  <li>
    <details open="">
      <summary><p>Toggle Item 2</p></summary>
    </details>
  </li>
</ul>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "toggleListItemWithChildren",
      content: `<ul>
  <li>
    <details open="">
      <summary><p>Toggle Item</p></summary>
      <p>Child 1</p>
      <p>Child 2</p>
    </details>
  </li>
</ul>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "toggleHeading",
      content: `<details>
  <summary><h2>Toggle Heading</h2></summary>
  <p>Heading Child 1</p>
</details>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "toggleHeadingWithoutChildren",
      content: `<details>
  <summary><h3>Toggle Heading No Children</h3></summary>
</details>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "standaloneDetailsSummary",
      content: `<details>
  <summary>Toggle text</summary>
  <p>Child paragraph 1</p>
  <p>Child paragraph 2</p>
</details>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "mixedToggleAndBulletList",
      content: `<ul>
  <li>Bullet Item</li>
  <li>
    <details open="">
      <summary><p>Toggle Item</p></summary>
      <p>Toggle Child</p>
    </details>
  </li>
  <li>Another Bullet</li>
</ul>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "toggleListItemWithImage",
      content: `<details>
  <summary>Toggle with image</summary>
  <img src="exampleURL">
  <p>Text after image</p>
</details>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "trailing whitespace",
      content: `<p>hello, </p>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "whitespace prefix",
      content: `<p> hello,</p>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "msWordPaste",
      content: `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
xmlns="http://www.w3.org/TR/REC-html40">

<head>
<meta http-equiv=Content-Type content="text/html; charset=utf-8">
<meta name=ProgId content=Word.Document>
<meta name=Generator content="Microsoft Word 15">
<meta name=Originator content="Microsoft Word 15">
<style>
<!--
 /* Style Definitions */
 p.MsoNormal, li.MsoNormal, div.MsoNormal
\t{margin-top:0cm;
\tmargin-right:0cm;
\tmargin-bottom:8.0pt;
\tmargin-left:0cm;
\tline-height:107%;
\tfont-size:11.0pt;
\tfont-family:"Calibri",sans-serif;}
-->
</style>
</head>

<body lang=en-NL style='tab-interval:36.0pt;word-wrap:break-word'>
<!--StartFragment-->

<p class=MsoNormal><b><u><span lang=FR>Que se passe-t-il si je réponds tard à
un message chat et que l'utilisateur n'est plus en ligne&nbsp;:<o:p></o:p></span></u></b></p>

<p class=MsoNormal><span lang=FR>Lorsque vous envoyez un message à un
utilisateur dans une conversation chat, et qu'il est encore en ligne, il
recevra le message sur sa bulle chatbot.<o:p></o:p></span></p>

<p class=MsoNormal style='margin-bottom:0cm;line-height:normal'><span lang=FR>Cependant
S'il n'est plus en ligne, votre message sera envoyé par email si :<o:p></o:p></span></p>

<p class=MsoNormal style='margin-bottom:0cm;line-height:normal'><span lang=FR>.
l'utilisateur n'a pas lu votre réponse après 2 minutes<o:p></o:p></span></p>

<p class=MsoNormal style='margin-bottom:0cm;line-height:normal'><span lang=FR>.
l'utilisateur n'est plus présent sur votre site web<o:p></o:p></span></p>

<p class=MsoNormal><span lang=FR><o:p>&nbsp;</o:p></span></p>

<p class=MsoNormal><span lang=FR>Cela se fait automatiquement donc, lorsque
nous répondons par chat, si l'utilisateur n'est plus là, Crisp renvoie le
message alors par email et le canal de discussion se transforme en canal de
discussion email.<br>
<br>
Il est possible aussi de créer une conversation email directement le profil de
l'utilisateur (bouton bleu en haut à droite de la conversation)<o:p></o:p></span></p>

<!--EndFragment-->
</body>

</html>`,
    },
    executeTest: testParseHTML,
  },
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

#### Heading 4

##### Heading 5

###### Heading 6

Paragraph

---

P**ara***grap*h

***

P*ara*~~grap~~h

___

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
  {
    testCase: {
      name: "basicBlockquote",
      content: `> This is a blockquote

This is not a blockquote`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "twoBlockquotes",
      content: `> First quote

> Second quote

Regular paragraph`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "inlineContentInBlockquote",
      content: `> **Bold** *Italic* ~~Strikethrough~~ ***Multiple***

Regular paragraph`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "image",
      content: `![Image](https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png)`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "video",
      content: `![Video](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm)`,
    },
    executeTest: testParseMarkdown,
  },
  // Individual heading levels
  {
    testCase: {
      name: "headingH1",
      content: `# Heading 1`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "headingH2",
      content: `## Heading 2`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "headingH3",
      content: `### Heading 3`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "headingH4",
      content: `#### Heading 4`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "headingH5",
      content: `##### Heading 5`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "headingH6",
      content: `###### Heading 6`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "headingWithInlineStyles",
      content: `# **Bold** *Italic* ~~Strike~~ Heading`,
    },
    executeTest: testParseMarkdown,
  },
  // Setext headings
  {
    testCase: {
      name: "setextH1",
      content: `Heading 1
===`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "setextH2",
      content: `Heading 2
---`,
    },
    executeTest: testParseMarkdown,
  },
  // Code blocks
  {
    testCase: {
      name: "codeBlockBasic",
      content: `\`\`\`
console.log('Hello');
\`\`\``,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "codeBlockWithLanguage",
      content: `\`\`\`javascript
const x = 42;
console.log(x);
\`\`\``,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "codeBlockPython",
      content: `\`\`\`python
def hello():
    print("Hello, world!")
\`\`\``,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "codeBlockWithSpecialChars",
      content: `\`\`\`html
<div class="test">
  <p>Hello **not bold**</p>
</div>
\`\`\``,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "codeBlockTildes",
      content: `~~~
code with tildes
~~~`,
    },
    executeTest: testParseMarkdown,
  },
  // Horizontal rules
  {
    testCase: {
      name: "horizontalRuleDashes",
      content: `Paragraph above

---

Paragraph below`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "horizontalRuleAsterisks",
      content: `Paragraph above

***

Paragraph below`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "horizontalRuleUnderscores",
      content: `Paragraph above

___

Paragraph below`,
    },
    executeTest: testParseMarkdown,
  },
  // Inline code
  {
    testCase: {
      name: "inlineCode",
      content: `This has \`inline code\` in it`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "inlineCodeWithSpecialChars",
      content: `Use \`const x = 42;\` to declare`,
    },
    executeTest: testParseMarkdown,
  },
  // Links
  {
    testCase: {
      name: "linkBasic",
      content: `[Example](https://example.com)`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "linkInParagraph",
      content: `Check out [this link](https://example.com) for more info.`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "linkWithStyledContent",
      content: `[**Bold link**](https://example.com)`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "adjacentLinks",
      content: `[Link1](https://example1.com)[Link2](https://example2.com)`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "linkAndText",
      content: `Before [Link](https://example.com) after`,
    },
    executeTest: testParseMarkdown,
  },
  // Tables
  {
    testCase: {
      name: "tableBasic",
      content: `| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "tableThreeColumns",
      content: `| A | B | C |
| - | - | - |
| 1 | 2 | 3 |`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "tableWithInlineFormatting",
      content: `| Header | Styled |
| ------ | ------ |
| Normal | **Bold** |
| *Italic* | ~~Strike~~ |`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "tableWithLinks",
      content: `| Name | Link |
| ---- | ---- |
| Example | [Click](https://example.com) |`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "tableAlignment",
      content: `| Left | Center | Right |
| :--- | :----: | ----: |
| L    | C      | R     |`,
    },
    executeTest: testParseMarkdown,
  },
  // Task lists / check lists
  {
    testCase: {
      name: "checkListBasic",
      content: `- [ ] Unchecked item
- [x] Checked item
- [ ] Another unchecked`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "checkListMixed",
      content: `- Regular bullet
- [ ] Check item
- [x] Checked item`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "checkListNested",
      content: `- [ ] Parent item
  - [x] Child checked
  - [ ] Child unchecked`,
    },
    executeTest: testParseMarkdown,
  },
  // Ordered list with start number
  {
    testCase: {
      name: "orderedListStart",
      content: `3. Third item
4. Fourth item
5. Fifth item`,
    },
    executeTest: testParseMarkdown,
  },
  // Hard breaks
  {
    testCase: {
      name: "hardBreakBackslash",
      content: `Line one\\
Line two`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "hardBreakMultiple",
      content: `Line one\\
Line two\\
Line three`,
    },
    executeTest: testParseMarkdown,
  },
  // Backslash escapes
  {
    testCase: {
      name: "backslashEscapes",
      content: `\\*not bold\\* \\[not a link\\] \\~not strike\\~`,
    },
    executeTest: testParseMarkdown,
  },
  // Escaped delimiter inside emphasis
  {
    testCase: {
      name: "escapedDelimiterInEmphasis",
      content: `*\\**`,
    },
    executeTest: testParseMarkdown,
  },
  // Nested emphasis
  {
    testCase: {
      name: "nestedEmphasis",
      content: `***bold and italic***`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "nestedEmphasisComplex",
      content: `**bold *bold and italic* bold**`,
    },
    executeTest: testParseMarkdown,
  },
  // Individual styles
  {
    testCase: {
      name: "boldOnly",
      content: `**Bold text**`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "italicOnly",
      content: `*Italic text*`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "strikethroughOnly",
      content: `~~Strikethrough text~~`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "boldUnderscore",
      content: `__Bold with underscores__`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "italicUnderscore",
      content: `_Italic with underscores_`,
    },
    executeTest: testParseMarkdown,
  },
  // Mixed inline content
  {
    testCase: {
      name: "mixedInlineContent",
      content: `Normal **bold** *italic* ~~strike~~ \`code\` [link](https://example.com)`,
    },
    executeTest: testParseMarkdown,
  },
  // Multiple paragraphs
  {
    testCase: {
      name: "multipleParagraphs",
      content: `First paragraph

Second paragraph

Third paragraph`,
    },
    executeTest: testParseMarkdown,
  },
  // Empty content
  {
    testCase: {
      name: "emptyString",
      content: ``,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "onlyWhitespace",
      content: `

   `,
    },
    executeTest: testParseMarkdown,
  },
  // Paragraph continuation (lines without blank line)
  {
    testCase: {
      name: "paragraphContinuation",
      content: `Line one
still same paragraph`,
    },
    executeTest: testParseMarkdown,
  },
  // Nested lists - complex
  {
    testCase: {
      name: "nestedBulletLists",
      content: `- Item 1
  - Nested 1
    - Deep nested
  - Nested 2
- Item 2`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "nestedOrderedLists",
      content: `1. First
   1. Sub first
   2. Sub second
2. Second`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "mixedListTypes",
      content: `- Bullet item
  1. Numbered child
  2. Another numbered
- Another bullet
  - [ ] Check child`,
    },
    executeTest: testParseMarkdown,
  },
  // Blockquote with multiple blocks
  {
    testCase: {
      name: "blockquoteMultiline",
      content: `> Line one
> Line two
> Line three`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "blockquoteWithCode",
      content: `> Quote with \`inline code\` inside`,
    },
    executeTest: testParseMarkdown,
  },
  {
    testCase: {
      name: "blockquoteWithLink",
      content: `> Quote with [a link](https://example.com) inside`,
    },
    executeTest: testParseMarkdown,
  },
  // Blockquote with lazy continuation (no > on continuation lines)
  {
    testCase: {
      name: "blockquoteLazyContinuation",
      content: `> This is a quote
that continues here
and here too`,
    },
    executeTest: testParseMarkdown,
  },
  // Complex document
  {
    testCase: {
      name: "complexDocument",
      content: `# Main Title

An introduction paragraph with **bold** and *italic* text.

## Section 1

- First bullet point
- Second bullet point
  - Nested point

> A notable quote

### Code Example

\`\`\`javascript
function hello() {
  return "world";
}
\`\`\`

---

## Section 2

1. Step one
2. Step two
3. Step three

| Feature | Status |
| ------- | ------ |
| Bold    | Done   |
| Italic  | Done   |

![Image](https://example.com/image.png)

Final paragraph with [a link](https://example.com).`,
    },
    executeTest: testParseMarkdown,
  },
  // Image with alt text
  {
    testCase: {
      name: "imageWithAlt",
      content: `![Alt text for image](https://example.com/photo.jpg)`,
    },
    executeTest: testParseMarkdown,
  },
  // Multiple images
  {
    testCase: {
      name: "multipleImages",
      content: `![First](https://example.com/first.png)

![Second](https://example.com/second.png)`,
    },
    executeTest: testParseMarkdown,
  },
  // Inline image within text (should be handled)
  {
    testCase: {
      name: "inlineImage",
      content: `Text before ![inline](https://example.com/img.png) text after`,
    },
    executeTest: testParseMarkdown,
  },
  // Code block immediately after heading
  {
    testCase: {
      name: "headingThenCode",
      content: `## Code Section

\`\`\`python
x = 42
\`\`\``,
    },
    executeTest: testParseMarkdown,
  },
  // List with styled items
  {
    testCase: {
      name: "listWithStyledItems",
      content: `- **Bold item**
- *Italic item*
- ~~Strikethrough item~~
- Item with \`code\``,
    },
    executeTest: testParseMarkdown,
  },
  // Deeply nested lists
  {
    testCase: {
      name: "deeplyNestedLists",
      content: `- Level 1
  - Level 2
    - Level 3
      - Level 4`,
    },
    executeTest: testParseMarkdown,
  },
  // Table followed by paragraph
  {
    testCase: {
      name: "tableFollowedByParagraph",
      content: `| Col 1 | Col 2 |
| ----- | ----- |
| A     | B     |

Paragraph after table`,
    },
    executeTest: testParseMarkdown,
  },
  // Paragraphs with various inline formatting
  {
    testCase: {
      name: "adjacentFormattedRuns",
      content: `**bold***italic*~~strike~~`,
    },
    executeTest: testParseMarkdown,
  },
  // Table without outer pipes (GFM allows optional outer pipes)
  {
    testCase: {
      name: "tablePipeless",
      content: `Col 1 | Col 2
----- | -----
A     | B`,
    },
    executeTest: testParseMarkdown,
  },
  // Indented fenced code block (up to 3 leading spaces per CommonMark)
  {
    testCase: {
      name: "codeBlockIndented",
      content: `   \`\`\`ts
const x = 1;
   \`\`\``,
    },
    executeTest: testParseMarkdown,
  },
  // Link with title (title should not appear in href)
  {
    testCase: {
      name: "linkWithTitle",
      content: `[example](https://example.com "Example Site")`,
    },
    executeTest: testParseMarkdown,
  },
  // Image with nested brackets in alt text
  {
    testCase: {
      name: "imageNestedBracketsAlt",
      content: `![alt [with] brackets](https://example.com/image.png)`,
    },
    executeTest: testParseMarkdown,
  },
  // Inline raw HTML tag inside a paragraph passes through verbatim
  {
    testCase: {
      name: "inlineHtmlTag",
      content: `Hello <em>world</em>!`,
    },
    executeTest: testParseMarkdown,
  },
  // Multiple inline HTML tags with attributes
  {
    testCase: {
      name: "inlineHtmlWithAttributes",
      content: `Text with <strong>bold</strong> and <a href="https://example.com">link</a>.`,
    },
    executeTest: testParseMarkdown,
  },
  // A self-closing-style void HTML tag inside a paragraph
  {
    testCase: {
      name: "inlineHtmlVoidTag",
      content: `Line one<br>line two.`,
    },
    executeTest: testParseMarkdown,
  },
  // Block-level raw HTML is emitted verbatim — not wrapped in <p>
  {
    testCase: {
      name: "blockHtmlDiv",
      content: `<div class="warn">
A warning block.
</div>`,
    },
    executeTest: testParseMarkdown,
  },
  // Block-level HTML comment
  {
    testCase: {
      name: "blockHtmlComment",
      content: `<!-- a comment -->

Next paragraph.`,
    },
    executeTest: testParseMarkdown,
  },
  // Bare angle brackets that don't form a valid tag must still be escaped
  {
    testCase: {
      name: "bareAngleBrackets",
      content: `1 < 2 and 3 > 0`,
    },
    executeTest: testParseMarkdown,
  },
  // Block HTML interrupting a paragraph above it
  {
    testCase: {
      name: "blockHtmlInterruptsParagraph",
      content: `Some text before.
<div>raw block</div>
Some text after.`,
    },
    executeTest: testParseMarkdown,
  },
  // Hard line break via two trailing spaces (CommonMark ex. 633)
  {
    testCase: {
      name: "hardBreakTwoSpaces",
      content: `Line one  \nLine two`,
    },
    executeTest: testParseMarkdown,
  },
  // ATX heading: closing #'s and trailing whitespace are stripped (ex. 73)
  {
    testCase: {
      name: "headingTrailingWhitespace",
      content: `### foo ###     `,
    },
    executeTest: testParseMarkdown,
  },
  // ATX heading: lots of internal padding still produces a clean heading (ex. 67)
  {
    testCase: {
      name: "headingInternalPadding",
      content: `#                  foo                     `,
    },
    executeTest: testParseMarkdown,
  },
  // Code span with internal newline collapses to space (CommonMark ex. 337)
  {
    testCase: {
      name: "codeSpanWithNewline",
      content: "`foo   bar \nbaz`",
    },
    executeTest: testParseMarkdown,
  },
  // Image with title attribute (CommonMark ex. 572). The title is parsed
  // even if the BlockNote image block doesn't surface it as a prop —
  // the point is to not leak `"title"` into the alt or src.
  {
    testCase: {
      name: "imageWithTitle",
      content: `![alt text](https://example.com/image.png "An image title")`,
    },
    executeTest: testParseMarkdown,
  },
  // Angle-bracket-wrapped image URL — brackets are stripped (ex. 580)
  {
    testCase: {
      name: "imageAngleBracketUrl",
      content: `![alt](<https://example.com/image.png>)`,
    },
    executeTest: testParseMarkdown,
  },
  // Paragraph lines with up to 3 leading spaces of indent are still a
  // paragraph; the indent is stripped (CommonMark ex. 222)
  {
    testCase: {
      name: "paragraphLeadingIndent",
      content: `  aaa\n bbb`,
    },
    executeTest: testParseMarkdown,
  },
];
