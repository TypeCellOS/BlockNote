import { BlockNoteEditor } from "@blocknote/core";
import { expect, it } from "vite-plus/test";
import { blockNoteSchemaToJSONSchema } from "./schemaToJSONSchema.js";

it("creates json schema", () => {
  // eslint-disable-next-line no-console
  const editor = BlockNoteEditor.create();

  const jsonSchema = blockNoteSchemaToJSONSchema(editor.schema);
  expect(jsonSchema).toMatchSnapshot();
  // console.log(JSON.stringify(blockNoteSchemaToJSONSchema(editor.schema), undefined, 2));
});
