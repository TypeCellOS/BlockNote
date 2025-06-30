import { BlockNoteEditor } from "@blocknote/core";

import { testSchema } from "./testSchema.js";

export const createTestEditor = () => () =>
  ({ schema: testSchema }) as BlockNoteEditor<any, any, any>;
