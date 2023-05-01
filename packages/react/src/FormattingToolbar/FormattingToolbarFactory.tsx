import {
  FormattingToolbar,
  FormattingToolbarStaticParams,
  FormattingToolbarDynamicParams,
  BlockSchema,
} from "@blocknote/core";
import { FormattingToolbar as ReactFormattingToolbar } from "./components/FormattingToolbar";
import { ReactElementFactory } from "../ElementFactory/components/ReactElementFactory";
import { FC } from "react";

export const createReactFormattingToolbarFactory = <
  BSchema extends BlockSchema
>(
  toolbar: FC<
    FormattingToolbarStaticParams<BSchema> &
      FormattingToolbarDynamicParams<BSchema>
  >
) => {
  return (staticParams: FormattingToolbarStaticParams<BSchema>) =>
    ReactElementFactory<
      FormattingToolbarStaticParams<BSchema>,
      FormattingToolbarDynamicParams<BSchema>
    >(staticParams, toolbar, {
      animation: "fade",
      placement: "top-start",
    });
};

export const ReactFormattingToolbarFactory = <BSchema extends BlockSchema>(
  staticParams: FormattingToolbarStaticParams<BSchema>
): FormattingToolbar<BSchema> =>
  ReactElementFactory<
    FormattingToolbarStaticParams<BSchema>,
    FormattingToolbarDynamicParams<BSchema>
  >(staticParams, ReactFormattingToolbar, {
    animation: "fade",
    placement: "top-start",
  });
