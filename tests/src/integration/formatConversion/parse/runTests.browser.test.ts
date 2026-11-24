import { beforeAll, describe } from "vite-plus/test";

import { useFileTestEditor } from "../../support/testEditorOptions.js";
import { testParseHTML, testParseMarkdown } from "./parseTestExecutors.js";
import { htmlParseCases, markdownParseCases } from "./parseTestInstances.js";

// Parsing reads the schema and does not install the result in the editor.
const it = useFileTestEditor();

beforeAll(() => {
  // Keep relative URL fixtures independent of the browser runner's port.
  const base = document.createElement("base");
  base.href = "http://localhost:3000/";
  document.head.prepend(base);
  return () => base.remove();
});

// Tests for verifying that importing blocks from other formats works as
// expected. Used for specific cases for when content from outside the editor is
// imported as blocks. This includes content from other editors, as well as
// content from the web that has produced bugs in the past.
describe("Parse tests (HTML)", () => {
  for (const testCase of htmlParseCases) {
    it(`${testCase.name}`, async ({ editor }) => {
      await testParseHTML(editor, testCase);
    });
  }
});

describe("Parse tests (Markdown)", () => {
  for (const testCase of markdownParseCases) {
    it(`${testCase.name}`, async ({ editor }) => {
      await testParseMarkdown(editor, testCase);
    });
  }
});
