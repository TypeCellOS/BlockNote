import { FC } from "react";
import { ReactCustomBlockRenderProps } from "../../schema/ReactBlockSpec";
import { fileBlockConfig, PartialBlockFromConfig } from "@blocknote/core";
import { ImageFile } from "./ImageFile";
import { RiImage2Fill } from "react-icons/ri";

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

export const reactFileBlockImageExtension: ReactFileBlockExtension = {
  fileEndings: [
    "apng",
    "avif",
    "gif",
    "jpg",
    "jpeg",
    "jfif",
    "pjpeg",
    "pjp",
    "svg",
    "webp",
  ],
  render: ImageFile,
  toExternalHTML: undefined,
  parse: undefined,
  buttonText: "image",
  buttonIcon: <RiImage2Fill size={24} />,
};
