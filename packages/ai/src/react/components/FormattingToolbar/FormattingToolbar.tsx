import { Dictionary } from "@blocknote/core";
import {
  FormattingToolbar as FormattingToolbarCore,
  FormattingToolbarProps,
  getFormattingToolbarItems as getFormattingToolbarCoreItems,
} from "@blocknote/react";
import { ReactNode } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor";
import { AIButton } from "./DefaultButtons/AIButton";
import {
  BlockTypeSelectItem,
  blockTypeSelectItems as defaultBlockTypeSelectItems,
} from "./DefaultSelects/BlockTypeSelect";

export const getFormattingToolbarItems = (
  dict: Dictionary,
  blockTypeSelectItems?: BlockTypeSelectItem[]
): JSX.Element[] => [
  ...getFormattingToolbarCoreItems(
    defaultBlockTypeSelectItems(dict) || blockTypeSelectItems
  ),
  <AIButton key={"aiButton"} />,
];

export const FormattingToolbar = (
  props: FormattingToolbarProps & { children?: ReactNode }
) => {
  const editor = useBlockNoteEditor();

  return (
    <FormattingToolbarCore
      blockTypeSelectItems={
        props.blockTypeSelectItems ||
        defaultBlockTypeSelectItems(editor.dictionary)
      }>
      {props.children ||
        getFormattingToolbarItems(
          editor.dictionary,
          props.blockTypeSelectItems
        )}
    </FormattingToolbarCore>
  );
};
