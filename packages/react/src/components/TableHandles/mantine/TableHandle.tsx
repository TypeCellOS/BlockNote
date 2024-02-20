import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { MdDragIndicator } from "react-icons/md";

import { TableHandleProps } from "../TableHandleProps";
import { TableHandleWrapper } from "./TableHandleWrapper";

export const TableHandle = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: TableHandleProps<I, S>
) => (
  <TableHandleWrapper {...props}>
    <MdDragIndicator size={24} data-test={"tableHandle"} />
  </TableHandleWrapper>
);
