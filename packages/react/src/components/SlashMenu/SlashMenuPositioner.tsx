import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { FC } from "react";

import { DefaultSlashMenu } from "./DefaultSlashMenu";
import {
  SuggestionMenuPositioner,
  SuggestionMenuProps,
} from "../../components-shared/SuggestionMenu/SuggestionMenuPositioner";
import { ReactSlashMenuItem } from "../../slashMenuItems/ReactSlashMenuItem";

export const SlashMenuPositioner = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  slashMenu?: FC<
    SuggestionMenuProps<ReactSlashMenuItem<BSchema, I, S>, BSchema, I, S>
  >;
}) => {
  const SlashMenu = props.slashMenu || DefaultSlashMenu;

  return (
    <SuggestionMenuPositioner
      editor={props.editor}
      suggestionsMenuName={"slashMenu"}
      suggestionsMenuComponent={SlashMenu}
    />
  );
};
