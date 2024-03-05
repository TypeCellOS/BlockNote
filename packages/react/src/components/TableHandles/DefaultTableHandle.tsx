import { BlockSchemaWithBlock, DefaultBlockSchema } from "@blocknote/core";
import { MdDragIndicator } from "react-icons/md";
import { TableHandle } from "./TableHandle";
import type { TableHandleProps } from "./TableHandlePositioner";

export const DefaultTableHandle = <
  BSchema extends BlockSchemaWithBlock<"table", DefaultBlockSchema["table"]>
>(
  props: TableHandleProps<BSchema, any, any>
) => (
  <TableHandle {...props}>
    <MdDragIndicator size={24} data-test={"tableHandle"} />
  </TableHandle>
);
