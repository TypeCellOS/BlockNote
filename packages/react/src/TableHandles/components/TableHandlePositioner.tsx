import {
  BaseUiElementState,
  Block,
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  TableHandlesState,
} from "@blocknote/core";
import Tippy, { tippy } from "@tippyjs/react";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import { DefaultTableHandle } from "./DefaultTableHandle";

export type TableHandlesProps<
  BSchema extends BlockSchema = DefaultBlockSchema
> = Omit<TableHandlesState, keyof BaseUiElementState> & {
  block: Block<BSchema["table"]["config"]>;
  editor: BlockNoteEditor<BSchema>;
  side: "top" | "left";
};

export const TableHandlesPositioner = <
  BSchema extends BlockSchema = DefaultBlockSchema
>(props: {
  editor: BlockNoteEditor<BSchema>;
  tableHandle?: FC<TableHandlesProps<BSchema>>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [block, setBlock] = useState<Block<BSchema["table"]["config"]>>();
  const [_, setForceUpdate] = useState<number>(0);

  const referencePosLeft = useRef<TableHandlesState["referencePosLeft"]>();
  const referencePosTop = useRef<TableHandlesState["referencePosTop"]>();

  useEffect(() => {
    tippy.setDefaultProps({ maxWidth: "" });

    return props.editor.tableHandles.onUpdate((state) => {
      console.log("update", state);
      setShow(state.show);
      setBlock(state.block as any); // TODO: types
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
    const TableHandle = props.tableHandle || DefaultTableHandle;

    return (
      <TableHandle editor={props.editor} side={"top"} block={block as any} />
    );
  }, [block, props.editor, props.tableHandle]);

  const tableHandleElementLeft = useMemo(() => {
    const TableHandle = props.tableHandle || DefaultTableHandle;

    return (
      <TableHandle editor={props.editor} side={"left"} block={block as any} />
    );
  }, [block, props.editor, props.tableHandle]);

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
