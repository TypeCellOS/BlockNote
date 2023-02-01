import {
  FormattingToolbar,
  FormattingToolbarFactory,
  FormattingToolbarStaticParams,
  FormattingToolbarDynamicParams,
} from "@blocknote/core";
import { FormattingToolbar as ReactFormattingToolbar } from "./components/FormattingToolbar";
import { ReactElementFactory } from "../ElementFactory/components/ReactElementFactory";

export const ReactFormattingToolbarFactory: FormattingToolbarFactory = (
  staticParams
): FormattingToolbar =>
  ReactElementFactory<
    FormattingToolbarStaticParams,
    FormattingToolbarDynamicParams
  >(staticParams, ReactFormattingToolbar, {
    animation: "fade",
    placement: "top-start",
  });
