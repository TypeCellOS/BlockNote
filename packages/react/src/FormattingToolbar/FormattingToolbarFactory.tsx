import {
  FormattingToolbar,
  FormattingToolbarFactory,
  FormattingToolbarStaticParams,
  FormattingToolbarDynamicParams,
} from "@blocknote/core";
import { FormattingToolbar as ReactFormattingToolbar } from "./components/FormattingToolbar";
import { ReactEditorElementFactory } from "../EditorElementFactory";

export const ReactFormattingToolbarFactory: FormattingToolbarFactory = (
  staticParams
): FormattingToolbar =>
  ReactEditorElementFactory<
    FormattingToolbarStaticParams,
    FormattingToolbarDynamicParams
  >(staticParams, ReactFormattingToolbar, {
    animation: "fade",
    placement: "top-start",
  });
