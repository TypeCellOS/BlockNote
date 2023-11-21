import {
  BlockNoteEditor,
  BlockSchemaWithBlock,
  DefaultBlockSchema,
  InlineContentSchema,
  SpecificBlock,
  TableHandlesState,
} from "@blocknote/core";
import { StyleSchema } from "@blocknote/core/src/extensions/Blocks/api/styles";
import Tippy, { tippy } from "@tippyjs/react";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import { DefaultTableHandle } from "./DefaultTableHandle";

export type TableHandlesProps<
  BSchema extends BlockSchemaWithBlock<"table", DefaultBlockSchema["table"]>,
  I extends InlineContentSchema,
  S extends StyleSchema
> = Omit<
  TableHandlesState<BSchema, I, S>,
  "referencePosLeft" | "referencePosTop" | "show"
> & {
  editor: BlockNoteEditor<BSchema, I, S>;
  side: "top" | "left";
};

export const TableHandlesPositioner = <
  BSchema extends BlockSchemaWithBlock<"table", DefaultBlockSchema["table"]>,
  I extends InlineContentSchema,
  S extends StyleSchema
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  tableHandle?: FC<TableHandlesProps<BSchema, I, S>>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [block, setBlock] = useState<SpecificBlock<BSchema, "table", I, S>>();
  const [colIndex, setColIndex] = useState<number>();
  const [rowIndex, setRowIndex] = useState<number>();
  const [_, setForceUpdate] = useState<number>(0);

  const referencePosLeft =
    useRef<TableHandlesState<BSchema, I, S>["referencePosLeft"]>();
  const referencePosTop =
    useRef<TableHandlesState<BSchema, I, S>["referencePosTop"]>();

  useEffect(() => {
    tippy.setDefaultProps({ maxWidth: "" });

    return props.editor.tableHandles!.onUpdate((state) => {
      console.log("update", state);
      setShow(state.show);
      setBlock(state.block);
      setColIndex(state.colIndex);
      setRowIndex(state.rowIndex);
      setForceUpdate(Math.random());

      referencePosLeft.current = state.referencePosLeft;
      referencePosTop.current = state.referencePosTop;
    });
  }, [props.editor]);

  const getReferenceClientRectLeft = useMemo(
    () => {
      if (!referencePosLeft.current) {
        return undefined;
      }
      return () =>
        ({ ...referencePosLeft.current!, width: 0, height: 0 } as DOMRect);
    },
    [referencePosLeft.current] // eslint-disable-line
  );

  const getReferenceClientRectTop = useMemo(
    () => {
      if (!referencePosTop.current) {
        return undefined;
      }
      return () =>
        ({ ...referencePosTop.current!, width: 0, height: 0 } as DOMRect);
    },
    [referencePosTop.current] // eslint-disable-line
  );

  const tableHandleElementTop = useMemo(() => {
    const TableHandle =
      props.tableHandle ||
      (DefaultTableHandle as FC<TableHandlesProps<BSchema, I, S>>);

    return (
      <TableHandle
        editor={props.editor as any}
        side={"top"}
        rowIndex={rowIndex!}
        colIndex={colIndex!}
        block={block!}
      />
    );
  }, [block, props.editor, props.tableHandle, rowIndex, colIndex]);

  const tableHandleElementLeft = useMemo(() => {
    const TableHandle =
      props.tableHandle ||
      (DefaultTableHandle as FC<TableHandlesProps<BSchema, I, S>>);

    return (
      <TableHandle
        // This "as any" unfortunately seems complicated to fix
        editor={props.editor as any}
        side={"left"}
        rowIndex={rowIndex!}
        colIndex={colIndex!}
        block={block!}
      />
    );
  }, [block, props.editor, props.tableHandle, rowIndex, colIndex]);

  return (
    <>
      <Tippy
        appendTo={props.editor.domElement.parentElement!}
        content={tableHandleElementLeft}
        getReferenceClientRect={getReferenceClientRectLeft}
        interactive={true}
        visible={show}
        animation={"fade"}
        placement={"left"}
        zIndex={5000}
      />
      <Tippy
        appendTo={props.editor.domElement.parentElement!}
        content={tableHandleElementTop}
        getReferenceClientRect={getReferenceClientRectTop}
        interactive={true}
        visible={show}
        animation={"fade"}
        placement={"top"}
        zIndex={5000}
      />
    </>
  );
};
