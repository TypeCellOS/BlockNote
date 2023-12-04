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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginInline: "-4px",
        overflow: "visible",
      }}>
      <MdDragIndicator size={24} data-test={"tableHandle"} />
    </div>
  </TableHandle>
);
