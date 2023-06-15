import {
  FormattingToolbarStaticParams,
  FormattingToolbarDynamicParams,
  BlockNoteEditor,
  BlockSchema,
} from "@blocknote/core";
import { FormattingToolbar as ReactFormattingToolbar } from "./components/FormattingToolbar";
import { ReactElementFactory } from "../ElementFactory/components/ReactElementFactory";
import { FC } from "react";
import { MantineThemeOverride } from "@mantine/core";

export const createReactFormattingToolbarFactory = <
  BSchema extends BlockSchema
>(
  theme: MantineThemeOverride,
  toolbar: FC<{
    editor: BlockNoteEditor<BSchema>;
  }> = ReactFormattingToolbar<BSchema>
) => {
  return (staticParams: FormattingToolbarStaticParams<BSchema>) =>
    ReactElementFactory<
      FormattingToolbarStaticParams<BSchema>,
      FormattingToolbarDynamicParams
    >(staticParams, toolbar, theme, {
      animation: "fade",
      placement: "top-start",
    });
};
