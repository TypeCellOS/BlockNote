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
<p>!<a href="https://www.pulsecarshalton.co.uk/wp-content/uploads/2016/08/jk-placeholder-image.jpg">https://www.pulsecarshalton.co.uk/wp-content/uploads/2016/08/jk-placeholder-image.jpg</a></p>
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
