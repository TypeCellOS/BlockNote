import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { MdDragIndicator } from "react-icons/md";
import { TableHandle } from "./TableHandle";
import type { TableHandleProps } from "./DefaultPositionedTableHandles";

export const DefaultTableHandle = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: TableHandleProps<I, S>
) => (
  <TableHandle {...props}>
    <MdDragIndicator size={24} data-test={"tableHandle"} />
  </TableHandle>
);
