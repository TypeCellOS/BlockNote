import {
  BlockColorsButton,
  DragHandleMenu,
  DragHandleMenuItem,
  DragHandleMenuProps,
  RemoveBlockButton,
} from "@blocknote/react";
import "@blocknote/react/style.css";
import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

export const CustomDragHandleMenu = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: DragHandleMenuProps<BSchema, I, S>
) => {
  return (
    <DragHandleMenu>
      <RemoveBlockButton {...props}>Delete</RemoveBlockButton>
      <BlockColorsButton {...props}>Colors</BlockColorsButton>
      {/*Custom item which opens an alert when clicked.*/}
      <DragHandleMenuItem onClick={() => window.alert("Button Pressed!")}>
        Open Alert
      </DragHandleMenuItem>
    </DragHandleMenu>
  );
};
