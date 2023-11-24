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
        width: "16px",
        height: "24px",
        overflow: "hidden",
      }}>
      <MdDragIndicator data-test={"tableHandle"} />
    </div>
  </TableHandle>
);
