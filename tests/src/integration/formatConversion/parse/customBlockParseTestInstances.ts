import type { ParseTestCase } from "./parseTestCase.js";

export const htmlParseCases: ParseTestCase[] = [
  {
    name: "mathBlock",
    content: `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><semantics><mrow><msup><mi>a</mi><mn>2</mn></msup><mo>+</mo><msup><mi>b</mi><mn>2</mn></msup><mo>=</mo><msup><mi>c</mi><mn>2</mn></msup></mrow><annotation encoding="application/x-tex">a^2 + b^2 = c^2</annotation></semantics></math>`,
  },
  {
    name: "diagramBlock",
    content: `<pre><code class="language-mermaid">graph TD\n  A[Start] --> B[End]</code></pre>`,
  },
];

// The diagram block's fenced-code representation should also round-trip from
// Markdown.
export const markdownParseCases: ParseTestCase[] = [
  {
    name: "diagramBlock",
    content: "```mermaid\ngraph TD\n  A[Start] --> B[End]\n```",
  },
  // The reverse precedence check: with the diagram block registered, fences
  // in other languages must still fall through to the code block.
  {
    name: "codeBlockNotDiagram",
    content: "```javascript\nconsole.log('hi');\n```",
  },
];
