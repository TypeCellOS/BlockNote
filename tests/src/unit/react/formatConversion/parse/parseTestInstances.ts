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

// NOTE: Only the block is covered in these tests. Inline `<math>` is foreign (non-HTML) content,
// and ProseMirror's clipboard parser in the jsdom unit environment doesn't run the inline
// content's `parseContent` for it, so pasting the copied inline math doubles its source here. It
// round-trips correctly in a real browser and should be covered by the browser-mode e2e suite
// instead.
export const parseTestInstancesHTML: TestInstance<
  ParseTestCase,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = [
  {
    testCase: {
      name: "mathBlock",
      content: `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><semantics><mrow><msup><mi>a</mi><mn>2</mn></msup><mo>+</mo><msup><mi>b</mi><mn>2</mn></msup><mo>=</mo><msup><mi>c</mi><mn>2</mn></msup></mrow><annotation encoding="application/x-tex">a^2 + b^2 = c^2</annotation></semantics></math>`,
    },
    executeTest: testParseHTML,
  },
  {
    testCase: {
      name: "diagramBlock",
      content: `<pre><code class="language-mermaid">graph TD\n  A[Start] --> B[End]</code></pre>`,
    },
    executeTest: testParseHTML,
  },
];

// The diagram block's fenced-code representation should also round-trip from
// Markdown.
export const parseTestInstancesMarkdown: TestInstance<
  ParseTestCase,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = [
  {
    testCase: {
      name: "diagramBlock",
      content: "```mermaid\ngraph TD\n  A[Start] --> B[End]\n```",
    },
    executeTest: testParseMarkdown,
  },
  // The reverse precedence check: with the diagram block registered, fences
  // in other languages must still fall through to the code block.
  {
    testCase: {
      name: "codeBlockNotDiagram",
      content: "```javascript\nconsole.log('hi');\n```",
    },
    executeTest: testParseMarkdown,
  },
];
