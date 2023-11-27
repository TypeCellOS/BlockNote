import { BlockSchemaWithBlock, DefaultBlockSchema } from "@blocknote/core";
import { MdDragIndicator } from "react-icons/md";
import { TableHandle } from "./TableHandle";
import { TableHandleProps } from "./TableHandlePositioner";

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
        width: "16px",
        height: "24px",
        overflow: "hidden",
      }}>
      <MdDragIndicator data-test={"tableHandle"} />
    </div>
  </TableHandle>
);
