import { ParseTestCase } from "../../../shared/formatConversion/parse/parseTestCase.js";
import { testParseHTML } from "../../../shared/formatConversion/parse/parseTestExecutors.js";
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
];
