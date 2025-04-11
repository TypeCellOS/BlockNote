import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

export type TestExecutor<
  TestCase,
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = (editor: BlockNoteEditor<B, I, S>, testCase: TestCase) => Promise<void>;

export type TestInstance<
  TestCase,
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  testCase: TestCase;
  executeTest: TestExecutor<TestCase, B, I, S>;
};
