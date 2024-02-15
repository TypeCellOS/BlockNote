import { BlockSchemaWithBlock, DefaultBlockSchema } from "@blocknote/core";

export type BlockSchemaWithTable = BlockSchemaWithBlock<
  "table",
  DefaultBlockSchema["table"]
>;
