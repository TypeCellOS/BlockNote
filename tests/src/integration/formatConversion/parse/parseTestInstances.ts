import type { ParseTestCase } from "./parseTestCase.js";

export const htmlParseCases: ParseTestCase[] = [
  {
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
  {
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
  // TODO this test's result not exactly right, but it's close enough for now.
  {
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
  {
    name: "checkListItem",
    content: `<ul>
  <li>
    <input type="checkbox">
    <p>Paragraph</p>
  <li>
</ul>`,
  },
  {
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
  {
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
  {
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
  {
    name: "multipleParagraphListItem",
    content: `<ul>
  <li>
    <p>Bullet List Item</p>
    <p>Bullet List Item</p>
  </li>
  <li>Bullet List Item</li>
</ul>`,
  },
  {
    name: "textWithImageListItem",
    content: `<ul>
  <li>
    Bullet List Item
    <img src="exampleURL">
  </li>
  <li>Bullet List Item</li>
</ul>`,
  },
  {
    name: "paragraphWithImageListItem",
    content: `<ul>
  <li>
    <p>Bullet List Item</p>
    <img src="exampleURL">
  </li>
  <li>Bullet List Item</li>
</ul>`,
  },
  {
    name: "imageWithTextListItem",
    content: `<ul>
  <li>
    <img src="exampleURL">
    Bullet List Item
  </li>
  <li>Bullet List Item</li>
</ul>`,
  },
  {
    name: "imageWithParagraphListItem",
    content: `<ul>
  <li>
    <img src="exampleURL">
    <p>Bullet List Item</p>
  </li>
  <li>Bullet List Item</li>
</ul>`,
  },
  {
    name: "styledTextListItem",
    content: `<ul>
  <li>Bullet List Item <b>Bold</b></li>
  <li>Bullet List Item</li>
</ul>`,
  },
  {
    name: "styledTextWithImageListItem",
    content: `<ul>
  <li>
    <b>Bold</b> Bullet List Item
    <img src="exampleURL">
  </li>
  <li>Bullet List Item</li>
</ul>`,
  },
  {
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
  {
    name: "headingParagraphListItem",
    content: `<ul>
  <li>
    <h1>Bullet List Item</h1>
    <p>Bullet List Item</p>
  </li>
  <li>Bullet List Item</li>
</ul>`,
  },
  {
    name: "paragraphHeadingListItem",
    content: `<ul>
  <li>
    <p>Bullet List Item</p>
    <h1>Bullet List Item</h1>
  </li>
  <li>Bullet List Item</li>
</ul>`,
  },
  // The cases below are for a list item with a nested list and other blocks.
  // All the blocks stay in the list item, in the order of the HTML.
  {
    name: "listItemParagraphAfterNestedList",
    content: `<ul><li><p>Item 1</p><ul><li><p>Nested</p></li></ul><p>After</p></li><li><p>Item 2</p></li></ul>`,
  },
  // The text after the nested list is a paragraph. It keeps one space of the
  // HTML source at its start, as each text after a block does in the parse.
  {
    name: "listItemTextAfterNestedList",
    content: `<ul>
  <li>
    Item 1
    <ul>
      <li>Nested</li>
    </ul>
    After <b>bold</b>
  </li>
  <li>Item 2</li>
</ul>`,
  },
  {
    name: "listItemImageAfterNestedList",
    content: `<ul><li><p>Item 1</p><ul><li><p>Nested</p></li></ul><img src="exampleURL"></li><li><p>Item 2</p></li></ul>`,
  },
  {
    name: "listItemBlockBeforeNestedList",
    content: `<ul><li><p>Item 1</p><pre><code>Code</code></pre><ul><li><p>Nested</p></li></ul></li><li><p>Item 2</p></li></ul>`,
  },
  {
    name: "listItemBlocksAroundNestedLists",
    content: `<ol><li><p>Item 1</p><p>Before</p><ul><li><p>Nested 1</p></li></ul><p>Between</p><ol><li><p>Nested 2</p></li></ol><p>After</p></li><li><p>Item 2</p></li></ol>`,
  },
  {
    name: "checkListItemBlocksAroundNestedList",
    content: `<ul><li><input type="checkbox" checked><p>Item 1</p><ul><li><p>Nested</p></li></ul><p>After</p></li></ul>`,
  },
  // A comment or an empty element before the content of a list item is not
  // the content of the list item.
  {
    name: "listItemEmptyNodeBeforeContent",
    content: `<ul>
  <li><!-- comment --><p>Item 1</p><ul><li><p>Nested 1</p></li></ul></li>
  <li><a id="anchor"></a><p>Item 2</p><ul><li><p>Nested 2</p></li></ul></li>
  <li><span></span><p>Item 3</p><ul><li><p>Nested 3</p></li></ul></li>
  <li><!--[--><p>Item 4</p><!--]--><ul><li><p>Nested 4</p></li></ul></li>
  <li>
    <!-- comment -->
    <p>Item 5</p>
    <ul><li><p>Nested 5</p></li></ul>
  </li>
</ul>`,
  },
  // An empty paragraph before the content of a list item is not the content
  // of the list item. Tiptap writes this form for an empty first line.
  {
    name: "listItemEmptyParagraphBeforeContent",
    content: `<ul><li><p></p><p>Item 1</p><ul><li><p>Nested</p></li></ul></li></ul>`,
  },
  // The HTML export of Notion: the text of the list item is directly in the
  // `<li>`, and a child block comes after it.
  {
    name: "listItemTextAndBlockBeforeNestedList",
    content: `<ul class="bulleted-list"><li style="list-style-type:disc">Item 1<p class="">Child</p><ul class="bulleted-list"><li style="list-style-type:circle">Nested</li></ul></li></ul>`,
  },
  // GitHub puts an image into a link. The image is a block, thus the text
  // before the link is the content of the list item.
  {
    name: "listItemLinkedImageBeforeNestedList",
    content: `<ul dir="auto">
<li>Item 1 <a target="_blank" rel="noopener noreferrer" href="https://example.com/image.png"><img src="https://example.com/image.png" alt="alt" style="max-width: 100%;"></a>
<ul dir="auto">
<li>Nested</li>
</ul>
</li>
</ul>`,
  },
  // A markdown renderer writes these forms for a list item that starts with a
  // heading, a code block or a quote.
  {
    name: "listItemHeadingCodeQuoteBeforeNestedList",
    content: `<ul>
  <li><h3>Heading</h3><p>Child 1</p><ul><li>Nested 1</li></ul></li>
  <li><pre><code>Code</code></pre><p>Child 2</p><ul><li>Nested 2</li></ul></li>
  <li><blockquote><p>Quote</p></blockquote><p>Child 3</p><ul><li>Nested 3</li></ul></li>
</ul>`,
  },
  // Plate puts the content of a list item into a `div`. The `div` is not the
  // first child block of the list item.
  {
    name: "listItemContentInDivBeforeNestedList",
    content: `<ul class="slate-ul"><li class="slate-li"><div class="slate-lic">Item 1</div><ul class="slate-ul"><li class="slate-li"><div class="slate-lic">Nested</div></li></ul></li></ul>`,
  },
  // Lexical puts a nested list into a list item of its own. The nested list
  // goes to the list item before it.
  {
    name: "nestedListInOwnListItem",
    content: `<ul><li value="1"><span style="white-space: pre-wrap;">Item 1</span></li><li value="2"><ul><li value="1"><span style="white-space: pre-wrap;">Nested</span></li></ul></li><li value="2"><span style="white-space: pre-wrap;">Item 2</span></li></ul>`,
  },
  // The same form with check boxes. Lexical writes the check state as
  // `aria-checked`, which the parser does not read. Thus this case has `input`
  // elements.
  {
    name: "nestedCheckListInOwnListItem",
    content: `<ul><li><input type="checkbox" checked>Item 1</li><li><ul><li><input type="checkbox">Nested</li></ul></li><li><input type="checkbox">Item 2</li></ul>`,
  },
  // A nested list in the list item, and a list next to the list item (the
  // form of Google Docs). Both are children of the list item. No known tool
  // writes the two forms together.
  {
    name: "nestedListInAndNextToListItem",
    content: `<ul><li>Item 1<ul><li>Nested 1</li></ul></li><ul><li>Nested 2</li></ul></ul>`,
  },
  {
    name: "textTableCell",
    content: `<table>
  <tbody>
    <tr>
      <td>Table Cell</td>
    </tr>  
  </tbody>
</table>`,
  },
  {
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
  {
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
  {
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
  {
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
  {
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
  {
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
  {
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
  {
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
  {
    name: "twoDivs",
    content: `<div>Single Div</div><div>second Div</div>`,
  },
  {
    name: "imageInParagraph",
    content: `<p>
  <img src="exampleURL">
</p>`,
  },
  // An image in the text of a paragraph, as a blog writes it. An image is a
  // block, so the paragraph splits around the image.
  {
    name: "inlineImageInParagraph",
    content: `<p>We arrived at the harbor before dusk. <img class="alignnone size-medium wp-image-1234" src="https://example.com/wp-content/uploads/harbor-300x200.jpg" alt="The harbor at dusk" width="300" height="200"> The boats were in.</p>`,
  },
  // The parts of the paragraph keep its alignment and its colors.
  {
    name: "inlineImageInStyledParagraph",
    content: `<p style="text-align: center; color: red; background-color: yellow;">Before <img src="https://example.com/harbor.jpg" alt="The harbor"> and <strong>after</strong></p>`,
  },
  // An image in the paragraph of a list item, as GitHub writes it (the image
  // is in a link). The image and the text after it become children of the
  // list item.
  {
    name: "inlineImageInListItemParagraph",
    content: `<ul dir="auto">
<li>
<p dir="auto">Open the menu <a target="_blank" rel="noopener noreferrer" href="https://github.com/octo/repo/blob/main/docs/menu.png"><img src="https://github.com/octo/repo/raw/main/docs/menu.png" alt="The menu" style="max-width: 100%;"></a> and select a block</p>
</li>
<li>
<p dir="auto">Close the menu</p>
</li>
</ul>`,
  },
  // An image in a quote, as a markdown renderer writes it. The quote splits
  // around the image.
  {
    name: "inlineImageInQuote",
    content: `<blockquote><p>As the picture shows <img src="https://example.com/diagram.png" alt="A diagram"> the result is good.</p></blockquote>`,
  },
  // An image in a heading (a logo next to a title). The heading splits around
  // the image. There is no text before the image, so there is no heading
  // before it.
  {
    name: "inlineImageInHeading",
    content: `<h1><img src="https://example.com/logo.png" alt="Project logo" width="32"> Project</h1>`,
  },
  // Images in table cells, as GitHub writes them (each image is in a link). A
  // table cell cannot hold a block, so the image becomes a link with its alt
  // text.
  {
    name: "inlineImageInTableCell",
    content: `<table>
<thead>
<tr>
<th>Light</th>
<th>Dark</th>
</tr>
</thead>
<tbody>
<tr>
<td><a target="_blank" rel="noopener noreferrer" href="https://github.com/octo/repo/blob/main/docs/light.png"><img src="https://github.com/octo/repo/raw/main/docs/light.png" alt="Light theme" style="max-width: 100%;"></a></td>
<td><a target="_blank" rel="noopener noreferrer" href="https://github.com/octo/repo/blob/main/docs/dark.png"><img src="https://github.com/octo/repo/raw/main/docs/dark.png" alt="Dark theme" style="max-width: 100%;"></a></td>
</tr>
</tbody>
</table>`,
  },
  {
    name: "fakeImageCaption",
    content: `<div>
  <img src="exampleURL">
  <p>Image Caption</p>
</div>`,
  },
  {
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
  {
    name: "inlineContentAndNestedBlocks",
    content: `<div>
  None <strong>Bold </strong><em>Italic </em><u>Underline </u><s>Strikethrough </s><strong><em><s><u>All</u></s></em></strong>
  <div>Nested Div</div>
  <p>Nested Paragraph</p>
</div>`,
  },
  {
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
  {
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
  {
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
  {
    name: "codeBlocks",
    content: `<pre><code>console.log("Should default to JS")</code></pre>
<pre><code data-language="typescript">console.log("Should parse TS from data-language")</code></pre>
<pre><code class="language-python">print("Should parse Python from language- class")</code></pre>
<pre><code class="language-ruby" data-language="typescript">console.log("Should prioritize TS from data-language over language- class")</code></pre>`,
  },
  {
    name: "codeBlocksMultiLine",
    content: `<pre><code>console.log("First Line")
console.log("Second Line")
console.log("Third Line")</code></pre>`,
  },
  {
    // Code copied from the web often nests HTML tags inside <code>:
    // syntax-highlighting <span>s (e.g. GitHub), formatting tags, and <br>
    // line breaks (<pre> allows phrasing content — it is not a raw-text
    // element). The text should be extracted with formatting dropped and
    // <br> converted to a newline. Literal angle brackets in code must be
    // escaped in the source HTML and parse to their decoded text.
    name: "codeBlocksNestedHTML",
    content: `<pre><code class="language-javascript"><span class="pl-k">const</span> <span class="pl-s1">x</span> = <span class="pl-c1">1</span>;
<span class="pl-en">log</span>(x);</code></pre>
<pre><code>line <b>one</b><br>line two</code></pre>
<pre><code class="language-html">&lt;div class="a"&gt;escaped&lt;/div&gt;</code></pre>`,
  },
  {
    name: "basicBlockquote",
    content: `<blockquote>This is a blockquote</blockquote>
<p>This is not a blockquote</p>`,
  },
  {
    name: "twoBlockquotes",
    content: `<blockquote>First quote</blockquote>
<blockquote>Second quote</blockquote>
<p>Regular paragraph</p>`,
  },
  {
    name: "inlineContentInBlockquote",
    content: `<blockquote><strong>Bold</strong> <em>Italic</em> <s>Strikethrough</s> <strong><em>Multiple</em></strong></blockquote>
<p>Regular paragraph</p>`,
  },
  {
    name: "boldStyle",
    content: `<p><strong>Bold</strong> <b>Bold</b> <span style="font-weight: bold">Bold</span></p>`,
  },
  {
    name: "italicStyle",
    content: `<p><em>Italic</em> <i>Italic</i> <span style="font-style: italic">Italic</span></p>`,
  },
  {
    name: "underlineStyle",
    content: `<p><u>Underline</u> <span style="text-decoration: underline">Underline</span></p>`,
  },
  {
    name: "strikeStyle",
    content: `<p><s>Strike</s> <del>Strike</del> <strike>Strike</strike> <span style="text-decoration: line-through">Strike</span></p>`,
  },
  {
    name: "textColorStyle",
    content: `<p><span style="color: blue">Blue Text</span> <span data-style-type="textColor" data-value="blue">Blue Text</span></p>`,
  },
  {
    name: "backgroundColorStyle",
    content: `<p><span style="background-color: blue">Blue Background</span> <span data-style-type="backgroundColor" data-value="blue">Blue Background</span></p>`,
  },
  {
    name: "orderedListStart",
    content: `<ol start="2">
  <li>List Item 2</li>
  <li>List Item 3</li>
  <li>List Item 4</li>
</ol>`,
  },
  // Only the first item gets the start of the list, also if items have a
  // nested list.
  {
    name: "orderedListStartWithNestedList",
    content: `<ol start="2">
  <li>List Item 2
    <ul>
      <li>Nested Item 1</li>
    </ul>
  </li>
  <li>List Item 3
    <ul>
      <li>Nested Item 2</li>
    </ul>
  </li>
  <li>List Item 4</li>
</ol>`,
  },
  {
    name: "imageWidth",
    content: `<img src="exampleURL" width="100">`,
  },
  {
    name: "textAlignmentProp",
    content: `<p style="text-align: center">Text Align Center</p>`,
  },
  {
    name: "textColorProp",
    content: `<p style="color: blue">Blue Text</p>
  <p data-text-color="blue">Blue Text</p>`,
  },
  {
    name: "backgroundColorProp",
    content: `<p style="background-color: blue">Blue Background</p>
  <p data-background-color="blue">Blue Background</p>`,
  },
  { name: "divider", content: `<hr/>` },
  {
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
  {
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
  // The checkbox belongs to the child. The toggle stays a toggle list item.
  {
    name: "toggleListItemWithCheckListChild",
    content: `<ul>
  <li>
    <details open="">
      <summary><p>Toggle Item</p></summary>
      <ul>
        <li><input type="checkbox" checked=""><p>Check Child</p></li>
      </ul>
    </details>
  </li>
</ul>`,
  },
  {
    name: "toggleHeading",
    content: `<details>
  <summary><h2>Toggle Heading</h2></summary>
  <p>Heading Child 1</p>
</details>`,
  },
  {
    name: "toggleHeadingWithoutChildren",
    content: `<details>
  <summary><h3>Toggle Heading No Children</h3></summary>
</details>`,
  },
  {
    name: "standaloneDetailsSummary",
    content: `<details>
  <summary>Toggle text</summary>
  <p>Child paragraph 1</p>
  <p>Child paragraph 2</p>
</details>`,
  },
  {
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
  {
    name: "toggleListItemWithImage",
    content: `<details>
  <summary>Toggle with image</summary>
  <img src="exampleURL">
  <p>Text after image</p>
</details>`,
  },
  {
    name: "trailing whitespace",
    content: `<p>hello, </p>`,
  },
  {
    name: "whitespace prefix",
    content: `<p> hello,</p>`,
  },
  {
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
  // The internal (`blocksToFullHTML`) form of a layout block. The frame's
  // slot, which holds the children, is marked with `data-frame-slot`.
  {
    name: "layoutBlock",
    content: `<div class="bn-block-group" data-node-type="blockGroup">
  <div class="callout" data-node-type="callout" data-id="1">
    <div class="callout-body" data-frame-slot="">
      <div class="bn-block-outer" data-node-type="blockOuter" data-id="2">
        <div class="bn-block" data-node-type="blockContainer" data-id="2">
          <div class="bn-block-content" data-content-type="paragraph">
            <p class="bn-inline-content">Callout child</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`,
  },
  // A layout block nested inside another, with a non-default prop on each.
  {
    name: "layoutNested",
    content: `<div class="bn-block-group" data-node-type="blockGroup">
  <div class="callout" data-flavor="warning" data-node-type="callout" data-id="1">
    <div class="callout-body" data-frame-slot="">
      <div class="bn-block-outer" data-node-type="blockOuter" data-id="2">
        <div class="bn-block" data-node-type="blockContainer" data-id="2">
          <div class="bn-block-content" data-content-type="heading">
            <h1 class="bn-inline-content">Nested heading</h1>
          </div>
        </div>
      </div>
      <div class="callout" data-flavor="info" data-node-type="callout" data-id="3">
        <div class="callout-body" data-frame-slot="">
          <div class="bn-block-outer" data-node-type="blockOuter" data-id="4">
            <div class="bn-block" data-node-type="blockContainer" data-id="4">
              <div class="bn-block-content" data-content-type="paragraph">
                <p class="bn-inline-content">Inner callout child</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`,
  },
  // An empty layout block children holder is filled to its schema minimum
  // when parsed into a valid document.
  {
    name: "layoutEmptyChildren",
    content: `<div class="bn-block-group" data-node-type="blockGroup">
  <div class="callout" data-node-type="callout" data-id="1">
    <div class="callout-body" data-frame-slot=""></div>
  </div>
</div>`,
  },
  // Layout block HTML without the `data-frame-slot` marker our own
  // serializers add: what a layout block looks like once it has been through
  // another app, or has come from an older version. The parse rule has to
  // fall back to reading the whole element as the children region.
  {
    name: "layoutExternalHTML",
    content: `<div class="callout" data-flavor="warning" data-node-type="callout" data-id="1">
  <div class="callout-body">
    <h1 data-nesting-level="1">Nested heading</h1>
    <div class="callout" data-flavor="info" data-node-type="callout" data-id="3" data-nesting-level="1">
      <div class="callout-body">
        <p data-nesting-level="2">Inner callout child</p>
      </div>
    </div>
  </div>
</div>`,
  },
  // The internal (`blocksToFullHTML`) form of a titled block: the title in
  // the block's own content, the body in its nested `blockGroup`. Parses
  // back to the alert with its title and both children, in order.
  {
    name: "titledBlock",
    content: `<div class="bn-block-group" data-node-type="blockGroup">
  <div class="bn-block-outer" data-node-type="blockOuter" data-id="1">
    <div class="bn-block" data-node-type="blockContainer" data-id="1">
      <div class="bn-block-content" data-content-type="alert">
        <div class="bn-inline-content alert">Heads up</div>
      </div>
      <div class="bn-block-group" data-node-type="blockGroup">
        <div class="bn-block-outer" data-node-type="blockOuter" data-id="2">
          <div class="bn-block" data-node-type="blockContainer" data-id="2">
            <div class="bn-block-content" data-content-type="paragraph">
              <p class="bn-inline-content">First</p>
            </div>
          </div>
        </div>
        <div class="bn-block-outer" data-node-type="blockOuter" data-id="3">
          <div class="bn-block" data-node-type="blockContainer" data-id="3">
            <div class="bn-block-content" data-content-type="paragraph">
              <p class="bn-inline-content">Second</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`,
  },
];

export const markdownParseCases: ParseTestCase[] = [
  {
    name: "basic",
    content: `# Heading
  
Paragraph

*   Bullet List Item

1.  Numbered List Item
`,
  },
  {
    name: "nested",
    content: `# Heading
  
Paragraph

*   Bullet List Item

    1.  Numbered List Item
`,
  },
  // The paragraph after the nested list stays in its list item.
  {
    name: "listItemParagraphAfterNestedList",
    content: `* Item 1

  * Nested

  After

* Item 2
`,
  },
  {
    name: "styled",
    content: `**Bold** *Italic* ~~Strikethrough~~ ***Multiple***`,
  },
  {
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
  {
    name: "boldWithWhitespace",
    content: `hello **beautiful ** world`,
  },
  {
    name: "issue226case1",
    content: `
- 📝 item1
- ⚙️ item2
- 🔗 item3

# h1
`,
  },
  {
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
  {
    name: "basicBlockquote",
    content: `> This is a blockquote

This is not a blockquote`,
  },
  {
    name: "twoBlockquotes",
    content: `> First quote

> Second quote

Regular paragraph`,
  },
  {
    name: "inlineContentInBlockquote",
    content: `> **Bold** *Italic* ~~Strikethrough~~ ***Multiple***

Regular paragraph`,
  },
  {
    name: "image",
    content: `![Image](https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png)`,
  },
  {
    name: "video",
    content: `![Video](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm)`,
  },
  // Individual heading levels
  {
    name: "headingH1",
    content: `# Heading 1`,
  },
  {
    name: "headingH2",
    content: `## Heading 2`,
  },
  {
    name: "headingH3",
    content: `### Heading 3`,
  },
  {
    name: "headingH4",
    content: `#### Heading 4`,
  },
  {
    name: "headingH5",
    content: `##### Heading 5`,
  },
  {
    name: "headingH6",
    content: `###### Heading 6`,
  },
  {
    name: "headingWithInlineStyles",
    content: `# **Bold** *Italic* ~~Strike~~ Heading`,
  },
  // Setext headings
  {
    name: "setextH1",
    content: `Heading 1
===`,
  },
  {
    name: "setextH2",
    content: `Heading 2
---`,
  },
  // Code blocks
  {
    name: "codeBlockBasic",
    content: `\`\`\`
console.log('Hello');
\`\`\``,
  },
  {
    name: "codeBlockWithLanguage",
    content: `\`\`\`javascript
const x = 42;
console.log(x);
\`\`\``,
  },
  {
    name: "codeBlockPython",
    content: `\`\`\`python
def hello():
    print("Hello, world!")
\`\`\``,
  },
  {
    name: "codeBlockWithSpecialChars",
    content: `\`\`\`html
<div class="test">
  <p>Hello **not bold**</p>
</div>
\`\`\``,
  },
  {
    name: "codeBlockTildes",
    content: `~~~
code with tildes
~~~`,
  },
  // Horizontal rules
  {
    name: "horizontalRuleDashes",
    content: `Paragraph above

---

Paragraph below`,
  },
  {
    name: "horizontalRuleAsterisks",
    content: `Paragraph above

***

Paragraph below`,
  },
  {
    name: "horizontalRuleUnderscores",
    content: `Paragraph above

___

Paragraph below`,
  },
  // Inline code
  {
    name: "inlineCode",
    content: `This has \`inline code\` in it`,
  },
  {
    name: "inlineCodeWithSpecialChars",
    content: `Use \`const x = 42;\` to declare`,
  },
  // Links
  {
    name: "linkBasic",
    content: `[Example](https://example.com)`,
  },
  {
    name: "linkInParagraph",
    content: `Check out [this link](https://example.com) for more info.`,
  },
  {
    name: "linkWithStyledContent",
    content: `[**Bold link**](https://example.com)`,
  },
  {
    name: "adjacentLinks",
    content: `[Link1](https://example1.com)[Link2](https://example2.com)`,
  },
  {
    name: "linkAndText",
    content: `Before [Link](https://example.com) after`,
  },
  {
    name: "linkCommonMarkAutolink",
    content: `Visit <https://example.com/path?q=1>

Invalid email domains stay plain: <a@b..c>`,
  },
  {
    name: "linkGfmAutolinkLiterals",
    content: `Visit https://example.com/path?q=1 or www.example.com.

Balanced parentheses stay linked: https://example.com/a(b)))

Entity suffix stays plain: https://example.com&copy;

Editor-compatible detection: https://invalid

Invalid schemeless domains stay plain: www.invalid_domain.com`,
  },
  {
    name: "linkWithFormattedAutolinkText",
    content: `[**https://example.com**](https://destination.com)`,
  },
  // Tables
  {
    name: "tableBasic",
    content: `| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |`,
  },
  {
    name: "tableThreeColumns",
    content: `| A | B | C |
| - | - | - |
| 1 | 2 | 3 |`,
  },
  {
    name: "tableWithInlineFormatting",
    content: `| Header | Styled |
| ------ | ------ |
| Normal | **Bold** |
| *Italic* | ~~Strike~~ |`,
  },
  {
    name: "tableWithLinks",
    content: `| Name | Link |
| ---- | ---- |
| Example | [Click](https://example.com) |`,
  },
  {
    name: "tableAlignment",
    content: `| Left | Center | Right |
| :--- | :----: | ----: |
| L    | C      | R     |`,
  },
  // Task lists / check lists
  {
    name: "checkListBasic",
    content: `- [ ] Unchecked item
- [x] Checked item
- [ ] Another unchecked`,
  },
  {
    name: "checkListMixed",
    content: `- Regular bullet
- [ ] Check item
- [x] Checked item`,
  },
  {
    name: "checkListNested",
    content: `- [ ] Parent item
  - [x] Child checked
  - [ ] Child unchecked`,
  },
  // A list item whose first block is a `<details>` toggle. The toggle's text
  // becomes the list item's content, and its children stay nested under it.
  {
    name: "numberedListItemStartsWithDetails",
    content: `1. <details>`,
  },
  {
    name: "checkListItemStartsWithDetails",
    content: `- [ ] <details>`,
  },
  {
    name: "numberedListItemStartsWithDetailsAndBody",
    content: `1. <details>
   <summary>Summary</summary>
   Body
   </details>`,
  },
  // Ordered list with start number
  {
    name: "orderedListStart",
    content: `3. Third item
4. Fourth item
5. Fifth item`,
  },
  // Hard breaks
  {
    name: "hardBreakBackslash",
    content: `Line one\\
Line two`,
  },
  {
    name: "hardBreakMultiple",
    content: `Line one\\
Line two\\
Line three`,
  },
  // Backslash escapes
  {
    name: "backslashEscapes",
    content: `\\*not bold\\* \\[not a link\\] \\~not strike\\~`,
  },
  // Escaped delimiter inside emphasis
  {
    name: "escapedDelimiterInEmphasis",
    content: `*\\**`,
  },
  // Nested emphasis
  {
    name: "nestedEmphasis",
    content: `***bold and italic***`,
  },
  {
    name: "nestedEmphasisComplex",
    content: `**bold *bold and italic* bold**`,
  },
  // Individual styles
  {
    name: "boldOnly",
    content: `**Bold text**`,
  },
  {
    name: "italicOnly",
    content: `*Italic text*`,
  },
  {
    name: "strikethroughOnly",
    content: `~~Strikethrough text~~`,
  },
  {
    name: "boldUnderscore",
    content: `__Bold with underscores__`,
  },
  {
    name: "italicUnderscore",
    content: `_Italic with underscores_`,
  },
  // Mixed inline content
  {
    name: "mixedInlineContent",
    content: `Normal **bold** *italic* ~~strike~~ \`code\` [link](https://example.com)`,
  },
  // Multiple paragraphs
  {
    name: "multipleParagraphs",
    content: `First paragraph

Second paragraph

Third paragraph`,
  },
  // Empty content
  {
    name: "emptyString",
    content: ``,
  },
  {
    name: "onlyWhitespace",
    content: `

   `,
  },
  // Line breaks
  {
    name: "lineBreaks",
    content: `Line one
Line two
Line three`,
  },
  // Nested lists - complex
  {
    name: "nestedBulletLists",
    content: `- Item 1
  - Nested 1
    - Deep nested
  - Nested 2
- Item 2`,
  },
  {
    name: "nestedOrderedLists",
    content: `1. First
   1. Sub first
   2. Sub second
2. Second`,
  },
  {
    name: "mixedListTypes",
    content: `- Bullet item
  1. Numbered child
  2. Another numbered
- Another bullet
  - [ ] Check child`,
  },
  // Blockquote with multiple blocks
  {
    name: "blockquoteMultiline",
    content: `> Line one
> Line two
> Line three`,
  },
  {
    name: "blockquoteWithCode",
    content: `> Quote with \`inline code\` inside`,
  },
  {
    name: "blockquoteWithLink",
    content: `> Quote with [a link](https://example.com) inside`,
  },
  // Blockquote with lazy continuation (no > on continuation lines)
  {
    name: "blockquoteLazyContinuation",
    content: `> This is a quote
that continues here
and here too`,
  },
  // Complex document
  {
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
  // Image with alt text
  {
    name: "imageWithAlt",
    content: `![Alt text for image](https://example.com/photo.jpg)`,
  },
  // Multiple images
  {
    name: "multipleImages",
    content: `![First](https://example.com/first.png)

![Second](https://example.com/second.png)`,
  },
  // An image in the text of a paragraph. An image is a block, so the paragraph
  // splits around the image.
  {
    name: "inlineImage",
    content: `Text before ![inline](https://example.com/img.png) text after`,
  },
  // An image in the text of a list item: the image and the text after it
  // become children of the list item.
  {
    name: "inlineImageInListItem",
    content: `- Item ![inline](https://example.com/img.png) text after`,
  },
  // An image in a quote: the quote splits around the image.
  {
    name: "inlineImageInQuote",
    content: `> Quote ![inline](https://example.com/img.png) text after`,
  },
  // An image in a heading: the heading splits around the image. Text before
  // and after the image gives two headings.
  {
    name: "inlineImageInHeading",
    content: `## Heading ![inline](https://example.com/img.png) text after`,
  },
  // Images in table cells, with text and alone. A table cell cannot hold a
  // block, so the image becomes a link with its alt text.
  {
    name: "inlineImageInTableCell",
    content: `| Step | Result |
| --- | --- |
| Open the menu ![The menu](https://example.com/menu.png) | ![The result](https://example.com/result.png) |`,
  },
  // Code block immediately after heading
  {
    name: "headingThenCode",
    content: `## Code Section

\`\`\`python
x = 42
\`\`\``,
  },
  // List with styled items
  {
    name: "listWithStyledItems",
    content: `- **Bold item**
- *Italic item*
- ~~Strikethrough item~~
- Item with \`code\``,
  },
  // Deeply nested lists
  {
    name: "deeplyNestedLists",
    content: `- Level 1
  - Level 2
    - Level 3
      - Level 4`,
  },
  // Table followed by paragraph
  {
    name: "tableFollowedByParagraph",
    content: `| Col 1 | Col 2 |
| ----- | ----- |
| A     | B     |

Paragraph after table`,
  },
  // Paragraphs with various inline formatting
  {
    name: "adjacentFormattedRuns",
    content: `**bold***italic*~~strike~~`,
  },
  // Table without outer pipes (GFM allows optional outer pipes)
  {
    name: "tablePipeless",
    content: `Col 1 | Col 2
----- | -----
A     | B`,
  },
  // A line that starts with a pipe, has many more pipes, and does not end
  // with a pipe is not a table row: it stays in its paragraph or quote.
  {
    name: "pipeLineInParagraph",
    content: `x\n|${" a |".repeat(60)} x\n`,
  },
  {
    name: "pipeLineInQuote",
    content: `> q\n|${" a |".repeat(60)} x\n`,
  },
  // Indented fenced code block (up to 3 leading spaces per CommonMark)
  {
    name: "codeBlockIndented",
    content: `   \`\`\`ts
const x = 1;
   \`\`\``,
  },
  // Link with title (title should not appear in href)
  {
    name: "linkWithTitle",
    content: `[example](https://example.com "Example Site")`,
  },
  // Image with nested brackets in alt text
  {
    name: "imageNestedBracketsAlt",
    content: `![alt [with] brackets](https://example.com/image.png)`,
  },
  // Inline raw HTML tag inside a paragraph passes through verbatim
  {
    name: "inlineHtmlTag",
    content: `Hello <em>world</em>!`,
  },
  // Multiple inline HTML tags with attributes
  {
    name: "inlineHtmlWithAttributes",
    content: `Text with <strong>bold</strong> and <a href="https://example.com">link</a>.`,
  },
  // A self-closing-style void HTML tag inside a paragraph
  {
    name: "inlineHtmlVoidTag",
    content: `Line one<br>line two.`,
  },
  // Block-level raw HTML is emitted verbatim — not wrapped in <p>
  {
    name: "blockHtmlDiv",
    content: `<div class="warn">
A warning block.
</div>`,
  },
  // Block-level HTML comment
  {
    name: "blockHtmlComment",
    content: `<!-- a comment -->

Next paragraph.`,
  },
  // Bare angle brackets that don't form a valid tag must still be escaped
  {
    name: "bareAngleBrackets",
    content: `1 < 2 and 3 > 0`,
  },
  // Block HTML interrupting a paragraph above it
  {
    name: "blockHtmlInterruptsParagraph",
    content: `Some text before.
<div>raw block</div>
Some text after.`,
  },
  // Hard line break via two trailing spaces (CommonMark ex. 633)
  {
    name: "hardBreakTwoSpaces",
    content: `Line one  \nLine two`,
  },
  // ATX heading: closing #'s and trailing whitespace are stripped (ex. 73)
  {
    name: "headingTrailingWhitespace",
    content: `### foo ###     `,
  },
  // ATX heading: lots of internal padding still produces a clean heading (ex. 67)
  {
    name: "headingInternalPadding",
    content: `#                  foo                     `,
  },
  // Code span with internal newline collapses to space (CommonMark ex. 337)
  {
    name: "codeSpanWithNewline",
    content: "`foo   bar \nbaz`",
  },
  // Image with title attribute (CommonMark ex. 572). The title is parsed
  // even if the BlockNote image block doesn't surface it as a prop —
  // the point is to not leak `"title"` into the alt or src.
  {
    name: "imageWithTitle",
    content: `![alt text](https://example.com/image.png "An image title")`,
  },
  // Angle-bracket-wrapped image URL — brackets are stripped (ex. 580)
  {
    name: "imageAngleBracketUrl",
    content: `![alt](<https://example.com/image.png>)`,
  },
  // Paragraph lines with up to 3 leading spaces of indent are still a
  // paragraph; the indent is stripped (CommonMark ex. 222)
  {
    name: "paragraphLeadingIndent",
    content: `  aaa\n bbb`,
  },
];
