import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  BlockSchemaWithBlock,
  DefaultBlockSchema,
  TableHandlesProsemirrorPlugin,
  TableHandlesState,
} from "@blocknote/core";
import Tippy, { tippy } from "@tippyjs/react";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import { DefaultTableHandle } from "./DefaultTableHandle";

export type TableHandlesProps<
  BSchema extends BlockSchema = DefaultBlockSchema
> = Pick<
  TableHandlesProsemirrorPlugin<BSchema>,
  | "rowDragStart"
  | "colDragStart"
  | "dragEnd"
  | "freezeHandles"
  | "unfreezeHandles"
> &
  Omit<
    TableHandlesState,
    "referencePosCell" | "referencePosTable" | "show" | "isDragging"
  > & {
    editor: BlockNoteEditor<
      BlockSchemaWithBlock<"table", DefaultBlockSchema["table"]["config"]>
    >;
    side: "top" | "left";
    showOtherSide: () => void;
    hideOtherSide: () => void;
  };

export const TableHandlesPositioner = <
  BSchema extends BlockSchemaWithBlock<
    "table",
    DefaultBlockSchema["table"]["config"]
  >
>(props: {
  editor: BlockNoteEditor<BSchema>;
  tableHandle?: FC<TableHandlesProps>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [hideRow, setHideRow] = useState<boolean>(false);
  const [hideCol, setHideCol] = useState<boolean>(false);
  const [block, setBlock] =
    useState<Block<DefaultBlockSchema["table"]["config"]>>();
  const [rowIndex, setRowIndex] = useState<number>();
  const [colIndex, setColIndex] = useState<number>();

  const [draggedCellOrientation, setDraggedCellOrientation] = useState<
    "row" | "col" | undefined
  >(undefined);
  const [mousePos, setMousePos] = useState<number | undefined>();

  const [_, setForceUpdate] = useState<number>(0);

  const referencePosCell = useRef<DOMRect>();
  const referencePosTable = useRef<DOMRect>();

  useEffect(() => {
    tippy.setDefaultProps({ maxWidth: "" });

    return props.editor.tableHandles.onUpdate((state) => {
      // console.log("update", state);
      setShow(state.show);
      setBlock(state.block);
      setRowIndex(state.rowIndex);
      setColIndex(state.colIndex);

      if (state.isDragging) {
        setDraggedCellOrientation(state.isDragging.draggedCellOrientation);
        setMousePos(state.isDragging.mousePos);
      } else {
        setDraggedCellOrientation(undefined);
        setMousePos(undefined);
      }

      setForceUpdate(Math.random());

      referencePosCell.current = state.referencePosCell;
      referencePosTable.current = state.referencePosTable;
    });
  }, [props.editor]);

  const getReferenceClientRectRow = useMemo(
    () => {
      if (!referencePosCell.current || !referencePosTable.current) {
        return undefined;
      }

      if (draggedCellOrientation === "row") {
        return () =>
          new DOMRect(
            referencePosTable.current!.x,
            mousePos!,
            referencePosTable.current!.width,
            0
          );
      }

      return () =>
        new DOMRect(
          referencePosTable.current!.x,
          referencePosCell.current!.y,
          referencePosTable.current!.width,
          referencePosCell.current!.height
        );
    },
    [referencePosTable.current, draggedCellOrientation, mousePos] // eslint-disable-line
  );

  const getReferenceClientRectColumn = useMemo(
    () => {
      if (!referencePosCell.current || !referencePosTable.current) {
        return undefined;
      }

      if (draggedCellOrientation === "col") {
        return () =>
          new DOMRect(
            mousePos!,
            referencePosTable.current!.y,
            0,
            referencePosTable.current!.height
          );
      }

      return () =>
        new DOMRect(
          referencePosCell.current!.x,
          referencePosTable.current!.y,
          referencePosCell.current!.width,
          referencePosTable.current!.height
        );
    },
    [referencePosTable.current, draggedCellOrientation, mousePos] // eslint-disable-line
  );

  const tableHandleElementTop = useMemo(() => {
    const TableHandle = props.tableHandle || DefaultTableHandle;

    return (
      <TableHandle
        editor={props.editor as any}
        side={"top"}
        rowIndex={rowIndex!}
        colIndex={colIndex!}
        block={block!}
        rowDragStart={props.editor.tableHandles.rowDragStart}
        colDragStart={props.editor.tableHandles.colDragStart}
        dragEnd={props.editor.tableHandles.dragEnd}
        freezeHandles={props.editor.tableHandles.freezeHandles}
        unfreezeHandles={props.editor.tableHandles.unfreezeHandles}
        showOtherSide={() => setHideRow(false)}
        hideOtherSide={() => setHideRow(true)}
      />
    );
  }, [block, props.editor, props.tableHandle, rowIndex, colIndex]);

  const tableHandleElementLeft = useMemo(() => {
    const TableHandle = props.tableHandle || DefaultTableHandle;

    return (
      <TableHandle
        // This "as any" unfortunately seems complicated to fix
        editor={props.editor as any}
        side={"left"}
        rowIndex={rowIndex!}
        colIndex={colIndex!}
        block={block!}
        rowDragStart={props.editor.tableHandles.rowDragStart}
        colDragStart={props.editor.tableHandles.colDragStart}
        dragEnd={props.editor.tableHandles.dragEnd}
        freezeHandles={props.editor.tableHandles.freezeHandles}
        unfreezeHandles={props.editor.tableHandles.unfreezeHandles}
        showOtherSide={() => setHideCol(false)}
        hideOtherSide={() => setHideCol(true)}
      />
    );
  }, [block, props.editor, props.tableHandle, rowIndex, colIndex]);

  return (
    <>
      <Tippy
        appendTo={props.editor.domElement.parentElement!}
        content={tableHandleElementLeft}
        getReferenceClientRect={getReferenceClientRectRow}
        interactive={true}
        visible={show && draggedCellOrientation !== "col" && !hideRow}
        animation={"fade"}
        placement={"left"}
        offset={rowOffset}
        zIndex={1000}
      />
      <Tippy
        appendTo={props.editor.domElement.parentElement!}
        content={tableHandleElementTop}
        getReferenceClientRect={getReferenceClientRectColumn}
        interactive={true}
        visible={show && draggedCellOrientation !== "row" && !hideCol}
        animation={"fade"}
        placement={"top"}
        offset={columnOffset}
        zIndex={1000}
      />
    </>
  );
};

const rowOffset: [number, number] = [0, -12];
const columnOffset: [number, number] = [0, -12];
