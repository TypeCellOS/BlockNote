import { BlockTypeDropdownItem } from "./mantine/DefaultDropdowns/BlockTypeDropdown";
import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  FormattingToolbarState,
  InlineContentSchema,
  StyleSchema,
  UiElementPosition,
} from "@blocknote/core";

export type FormattingToolbarProps<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
> = Omit<FormattingToolbarState<BSchema, I, S>, keyof UiElementPosition> & {
  blockTypeDropdownItems?: BlockTypeDropdownItem[];
};
