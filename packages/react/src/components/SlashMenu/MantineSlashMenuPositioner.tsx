import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  SlashMenuProsemirrorPlugin,
  SuggestionsMenuState,
} from "@blocknote/core";
import { FC, useEffect, useRef, useState } from "react";

import { ReactSlashMenuItem } from "../../slashMenuItems/ReactSlashMenuItem";
import { DefaultSlashMenu } from "./DefaultSlashMenu";

export type SlashMenuProps<BSchema extends BlockSchema = DefaultBlockSchema> =
  Pick<
    SlashMenuProsemirrorPlugin<BSchema, any, any, any>,
    "executeItem" | "closeMenu" | "clearQuery"
  > &
    Pick<
      SuggestionsMenuState<ReactSlashMenuItem<BSchema>>,
      "items" | "referencePos"
    > & {
      editor: BlockNoteEditor<BSchema, any, any>;
    };

export const MantineSlashMenuPositioner = <
  BSchema extends BlockSchema = DefaultBlockSchema
>(props: {
  editor: BlockNoteEditor<BSchema, any, any>;
  slashMenu?: FC<SlashMenuProps<BSchema>>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [items, setItems] = useState<Promise<ReactSlashMenuItem<BSchema>[]>>(
    new Promise((resolve) => resolve([]))
  );

  const referencePos = useRef<DOMRect>();

  useEffect(() => {
    return props.editor.slashMenu.onUpdate((slashMenuState) => {
      setShow(slashMenuState.show);
      setItems(slashMenuState.items);

      referencePos.current = slashMenuState.referencePos;
    });
  }, [props.editor, show]);

  if (!show || !referencePos.current || !items === undefined) {
    return null;
  }

  const SlashMenu = props.slashMenu || DefaultSlashMenu;

  return (
    <SlashMenu
      referencePos={referencePos.current!}
      editor={props.editor}
      items={items}
      executeItem={props.editor.slashMenu.executeItem}
      closeMenu={props.editor.slashMenu.closeMenu}
      clearQuery={props.editor.slashMenu.clearQuery}
    />
  );
};
