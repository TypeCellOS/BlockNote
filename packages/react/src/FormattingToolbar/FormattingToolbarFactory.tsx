import {
  FormattingToolbar,
  FormattingToolbarFactory,
  FormattingToolbarStaticParams,
  FormattingToolbarDynamicParams,
} from "@blocknote/core";
import { FormattingToolbar as ReactFormattingToolbar } from "./components/FormattingToolbar";
import { ReactElementFactory } from "../ElementFactory/components/ReactElementFactory";
import { MantineThemeOverride } from "@mantine/core";

export const createReactFormattingToolbarFactory =
  (theme: MantineThemeOverride): FormattingToolbarFactory =>
  (staticParams): FormattingToolbar =>
    ReactElementFactory<
      FormattingToolbarStaticParams,
      FormattingToolbarDynamicParams
    >(staticParams, ReactFormattingToolbar, theme, {
      animation: "fade",
      placement: "top-start",
    });
