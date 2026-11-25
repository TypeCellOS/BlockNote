import { afterAll, describe, type TestContext } from "vite-plus/test";

import { createSetupEditor } from "../../commands/browser/setupEditor.js";
import { testEditorOptions } from "../support/reactTestEditorOptions.js";
import type { TestExecutor } from "../types.js";
import type {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../support/reactTestSchema.js";
import type { ReactExportCase } from "./export/customBlockExportTestInstances.js";

export type ConversionExecutor = TestExecutor<
  ReactExportCase,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>;

// These cases render synchronously without retaining state. Media and source
// previews can register listeners or start work and need a fresh editor.
const reusableHtmlCases = new Set([
  "customParagraph/basic",
  "customParagraph/styled",
  "customParagraph/nested",
  "customParagraph/lineBreaks",
  "simpleCustomParagraph/basic",
  "simpleCustomParagraph/styled",
  "simpleCustomParagraph/nested",
  "contextParagraph/basic",
  "mention/basic",
  "tag/basic",
  "small/basic",
  "fontSize/basic",
]);

function registerCases(
  cases: readonly ReactExportCase[],
  executeTest: ConversionExecutor,
  share: boolean,
) {
  let dispose: (() => void | Promise<void>) | undefined;
  function mount(context: TestContext) {
    return createSetupEditor((cleanup) => {
      dispose = async () => cleanup(context);
    })(testEditorOptions);
  }

  let mounted: ReturnType<typeof mount> | undefined;
  if (share) {
    afterAll(() => dispose?.());
  }
  for (const testCase of cases) {
    it(testCase.name, async ({ setupEditor, task }) => {
      const { editor } = await (share
        ? (mounted ??= mount(task.context))
        : setupEditor(testEditorOptions));
      await executeTest(editor, testCase);
    });
  }
}

export function registerConversionCases(
  name: string,
  cases: readonly ReactExportCase[],
  executeTest: ConversionExecutor,
  reuseHtmlEditor = false,
) {
  const groups: Array<{ share: boolean; cases: ReactExportCase[] }> = [];
  for (const testCase of cases) {
    const share = reuseHtmlEditor && reusableHtmlCases.has(testCase.name);
    const group = groups.at(-1);
    if (group?.share === share) {
      group.cases.push(testCase);
    } else {
      groups.push({ share, cases: [testCase] });
    }
  }

  // Preserve full test names and order; unmount between groups.
  for (const { share, cases } of groups) {
    describe(name, () => registerCases(cases, executeTest, share));
  }
}
