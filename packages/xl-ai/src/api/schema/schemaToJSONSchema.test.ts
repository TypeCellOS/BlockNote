import { BlockNoteEditor } from "@blocknote/core";
import { expect, it } from "vitest";
import { blockNoteSchemaToJSONSchema } from "./schemaToJSONSchema.js";

it("creates json schema", async () => {
  // eslint-disable-next-line no-console
  const editor = BlockNoteEditor.create();

  const jsonSchema = blockNoteSchemaToJSONSchema(editor.schema);
  await expect(jsonSchema).toMatchSnapshot();
  // console.log(JSON.stringify(blockNoteSchemaToJSONSchema(editor.schema), undefined, 2));
});
