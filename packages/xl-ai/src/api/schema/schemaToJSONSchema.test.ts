import { BlockNoteSchema } from "@blocknote/core";
import { expect, it } from "vite-plus/test";
import { blockNoteSchemaToJSONSchema } from "./schemaToJSONSchema.js";

it("creates json schema", () => {
  const jsonSchema = blockNoteSchemaToJSONSchema(BlockNoteSchema.create());
  expect(jsonSchema).toMatchSnapshot();
});
