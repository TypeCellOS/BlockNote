import {
  FormattingToolbar,
  FormattingToolbarFactory,
  FormattingToolbarStaticParams,
  FormattingToolbarDynamicParams,
} from "@blocknote/core";
import { FormattingToolbar as ReactFormattingToolbar } from "./components/FormattingToolbar";
import { ReactElementFactory } from "../ElementFactory/components/ReactElementFactory";
import { FC } from "react";

export const createReactFormattingToolbarFactory = (
  toolbar: FC<FormattingToolbarStaticParams & FormattingToolbarDynamicParams>
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
