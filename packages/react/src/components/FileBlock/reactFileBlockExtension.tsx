import { fileBlockConfig, PartialBlockFromConfig } from "@blocknote/core";
import { FC } from "react";
import { ReactCustomBlockRenderProps } from "../../schema/ReactBlockSpec";

export type ReactFileBlockExtension = {
  fileEndings: string[];
  render: FC<
    Omit<
      ReactCustomBlockRenderProps<typeof fileBlockConfig, any, any>,
      "contentRef"
    >
  >;
  toExternalHTML?: FC<
    Omit<
      ReactCustomBlockRenderProps<typeof fileBlockConfig, any, any>,
      "contentRef"
    >
  >;
  parse?: (
    element: HTMLElement
  ) =>
    | PartialBlockFromConfig<typeof fileBlockConfig, any, any>["props"]
    | undefined;
  buttonText?: string;
  buttonIcon?: JSX.Element;
};
