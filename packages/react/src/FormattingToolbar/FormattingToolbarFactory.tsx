import {
  FormattingToolbarStaticParams,
  FormattingToolbarDynamicParams,
  BlockNoteEditor,
} from "@blocknote/core";
import { FormattingToolbar as ReactFormattingToolbar } from "./components/FormattingToolbar";
import { ReactElementFactory } from "../ElementFactory/components/ReactElementFactory";
import { FC } from "react";

export const createReactFormattingToolbarFactory = (
  toolbar: FC<{ editor: BlockNoteEditor }> = ReactFormattingToolbar
) => {
  return (staticParams: FormattingToolbarStaticParams) =>
    ReactElementFactory<
      FormattingToolbarStaticParams,
      FormattingToolbarDynamicParams
    >(staticParams, toolbar, {
      animation: "fade",
      placement: "top-start",
    });
};
