import {
  BlockFromConfigNoChildren,
  BlockNoteEditor,
  BlockSchemaWithBlock,
  DefaultBlockSchema,
  InlineContentSchema,
  StyleSchema,
  TableHandlesProsemirrorPlugin,
  TableHandlesState,
} from "@blocknote/core";
import Tippy, { tippy } from "@tippyjs/react";
import { DragEvent, FC, useEffect, useMemo, useRef, useState } from "react";
import { DragHandleMenuProps } from "../SideMenu/DragHandleMenu/DragHandleMenu";
import { DefaultTableHandle } from "./DefaultTableHandle";

export type TableHandleProps<
  BSchema extends BlockSchemaWithBlock<"table", DefaultBlockSchema["table"]>,
  I extends InlineContentSchema,
  S extends StyleSchema
> = Pick<
  TableHandlesProsemirrorPlugin<BSchema, I, S>,
  "dragEnd" | "freezeHandles" | "unfreezeHandles"
> &
  Omit<
    TableHandlesState<I, S>,
    | "rowIndex"
    | "colIndex"
    | "referencePosCell"
    | "referencePosTable"
    | "show"
    | "draggingState"
  > & {
    orientation: "row" | "column";
    editor: BlockNoteEditor<
      BlockSchemaWithBlock<"table", DefaultBlockSchema["table"]>
    >;
    tableHandleMenu?: FC<DragHandleMenuProps<BSchema, I, S>>;
    dragStart: (e: DragEvent<HTMLDivElement>) => void;
    index: number;
    // TODO: document this, explain why we need it
    showOtherSide: () => void;
    hideOtherSide: () => void;
  };

export const TableHandlesPositioner = <
  BSchema extends BlockSchemaWithBlock<"table", DefaultBlockSchema["table"]>,
  I extends InlineContentSchema,
  S extends StyleSchema
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  tableHandle?: FC<TableHandleProps<BSchema, I, S>>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [hideRow, setHideRow] = useState<boolean>(false);
  const [hideCol, setHideCol] = useState<boolean>(false);
  const [block, setBlock] =
    useState<BlockFromConfigNoChildren<DefaultBlockSchema["table"], I, S>>();

  const [rowIndex, setRowIndex] = useState<number>();
  const [colIndex, setColIndex] = useState<number>();

  const [draggedCellOrientation, setDraggedCellOrientation] = useState<
    "row" | "col" | undefined
  >(undefined);
  const [mousePos, setMousePos] = useState<number | undefined>();

  const [, setForceUpdate] = useState<number>(0);

  const referencePosCell = useRef<DOMRect>();
  const referencePosTable = useRef<DOMRect>();

  useEffect(() => {
    tippy.setDefaultProps({ maxWidth: "" });

    return props.editor.tableHandles!.onUpdate((state) => {
      // console.log("update", state.draggingState);
      setShow(state.show);
      setBlock(state.block);
      setRowIndex(state.rowIndex);
      setColIndex(state.colIndex);

      if (state.draggingState) {
        setDraggedCellOrientation(state.draggingState.draggedCellOrientation);
        setMousePos(state.draggingState.mousePos);
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

  const columnTableHandle = useMemo(() => {
    const TableHandle = props.tableHandle || DefaultTableHandle;

    return (
      <TableHandle
        orientation={"column"}
        // This "as any" unfortunately seems complicated to fix
        editor={props.editor as any}
        index={colIndex!}
        block={block!}
        dragStart={props.editor.tableHandles!.colDragStart}
        dragEnd={props.editor.tableHandles!.dragEnd}
        freezeHandles={props.editor.tableHandles!.freezeHandles}
        unfreezeHandles={props.editor.tableHandles!.unfreezeHandles}
        showOtherSide={() => setHideRow(false)}
        hideOtherSide={() => setHideRow(true)}
      />
    );
  }, [block, props.editor, props.tableHandle, colIndex]);

  const rowTableHandle = useMemo(() => {
    const TableHandle = props.tableHandle || DefaultTableHandle;

    return (
      <TableHandle
        orientation={"row"}
        editor={props.editor as any}
        index={rowIndex!}
        block={block!}
        dragStart={props.editor.tableHandles!.rowDragStart}
        dragEnd={props.editor.tableHandles!.dragEnd}
        freezeHandles={props.editor.tableHandles!.freezeHandles}
        unfreezeHandles={props.editor.tableHandles!.unfreezeHandles}
        showOtherSide={() => setHideCol(false)}
        hideOtherSide={() => setHideCol(true)}
      />
    );
  }, [block, props.editor, props.tableHandle, rowIndex]);

  return (
    <>
      <Tippy
        appendTo={props.editor.domElement.parentElement!}
        content={rowTableHandle}
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
        content={columnTableHandle}
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
