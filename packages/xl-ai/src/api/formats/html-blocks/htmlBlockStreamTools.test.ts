import { expect, expectTypeOf } from "vite-plus/test";
import type { StreamToolCall } from "../../../streamTool/streamTool.js";
import type { AddBlocksToolCall } from "../base-tools/createAddBlocksTool.js";
import { htmlBlockLLMFormat } from "./htmlBlocks.js";

it("exposes only HTML add operations when only add is enabled", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor();
  const streamTools = htmlBlockLLMFormat
    .getStreamToolsProvider({ defaultStreamTools: { add: true } })
    .getStreamTools(editor, true);

  expect(streamTools.map(({ name }) => name)).toEqual(["add"]);
  expectTypeOf<StreamToolCall<typeof streamTools>>().toEqualTypeOf<
    AddBlocksToolCall<string>
  >();
});
