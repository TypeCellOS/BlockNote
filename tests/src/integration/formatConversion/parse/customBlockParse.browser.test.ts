import { describe } from "vite-plus/test";

import { testSchema } from "../../support/reactTestSchema.js";
import { testParseHTML, testParseMarkdown } from "./parseTestExecutors.js";
import {
  htmlParseCases,
  markdownParseCases,
} from "./customBlockParseTestInstances.js";

// The parsers take an immutable string and build a fresh parsed tree. They do
// not edit the host editor; each executor still resets the mock ID counter.
const it = globalThis.it.extend(
  "parseEditor",
  { scope: "file" },
  // eslint-disable-next-line no-empty-pattern -- Vitest requires destructured fixture dependencies.
  async ({}, { onCleanup }) => {
    const { createSetupEditor } =
      await import("../../../commands/node/setupEditor.js");
    const { editor } = await createSetupEditor(onCleanup)({
      schema: testSchema,
      trailingBlock: false,
    });
    return editor;
  },
);

// The React math block and inline math implementations parse external MathML.
describe("React parse tests (HTML)", () => {
  for (const testCase of htmlParseCases) {
    it(`${testCase.name}`, async ({ parseEditor }) => {
      await testParseHTML(parseEditor, testCase);
    });
  }
});

describe("React parse tests (Markdown)", () => {
  for (const testCase of markdownParseCases) {
    it(`${testCase.name}`, async ({ parseEditor }) => {
      await testParseMarkdown(parseEditor, testCase);
    });
  }
});
