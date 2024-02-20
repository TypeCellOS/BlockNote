import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { Group } from "@mantine/core";
import { SideMenuProps } from "../SideMenuProps";
import { AddBlockButton } from "./DefaultButtons/AddBlockButton";
import { DragHandle } from "./DefaultButtons/DragHandle";

export const SideMenu = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: SideMenuProps<BSchema, I, S> & { children?: React.ReactNode }
) => {
  const { addBlock, ...rest } = props;

  return (
    <Group className={"bn-side-menu"} gap={0}>
      {props.children || (
        <>
          <AddBlockButton addBlock={addBlock} />
          <DragHandle {...rest} />
        </>
      )}
    </Group>
  );
};
