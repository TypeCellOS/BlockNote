import {
  FormattingToolbarStaticParams,
  FormattingToolbarDynamicParams,
  BlockNoteEditor,
} from "@blocknote/core";
import { FormattingToolbar as ReactFormattingToolbar } from "./components/FormattingToolbar";
import { ReactElementFactory } from "../ElementFactory/components/ReactElementFactory";
import { FC } from "react";
import { MantineThemeOverride } from "@mantine/core";

export const createReactFormattingToolbarFactory = (
  theme: MantineThemeOverride,
  toolbar: FC<{ editor: BlockNoteEditor }> = ReactFormattingToolbar
) => {
  return (staticParams: FormattingToolbarStaticParams) =>
    ReactElementFactory<
      FormattingToolbarStaticParams,
      FormattingToolbarDynamicParams
    >(staticParams, toolbar, theme, {
      animation: "fade",
      placement: "top-start",
    });
};
