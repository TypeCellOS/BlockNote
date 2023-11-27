import { BlockSchema } from "@blocknote/core";
import { MdDragIndicator } from "react-icons/md";
import { TableHandleProps } from "./TableHandlePositioner";
import { TableHandle } from "./TableHandle";

export const DefaultTableHandle = <BSchema extends BlockSchema>(
  props: TableHandleProps<BSchema>
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
