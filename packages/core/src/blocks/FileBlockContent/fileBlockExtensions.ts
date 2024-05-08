import {
  BlockFromConfig,
  BlockSchemaWithBlock,
  PartialBlockFromConfig,
} from "../../schema";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { fileBlockConfig } from "./fileBlockConfig";
import { renderImageFile } from "./renderImageFile";

export type FileBlockExtension = {
  fileEndings: string[];
  render: (
    block: BlockFromConfig<typeof fileBlockConfig, any, any>,
    editor: BlockNoteEditor<
      BlockSchemaWithBlock<"file", typeof fileBlockConfig>,
      any,
      any
    >
  ) => {
    dom: HTMLElement;
    destroy?: () => void;
  };
  toExternalHTML?: (
    block: BlockFromConfig<typeof fileBlockConfig, any, any>,
    editor: BlockNoteEditor<
      BlockSchemaWithBlock<"file", typeof fileBlockConfig>,
      any,
      any
    >
  ) => {
    dom: HTMLElement;
  };
  parse?: (
    element: HTMLElement
  ) =>
    | PartialBlockFromConfig<typeof fileBlockConfig, any, any>["props"]
    | undefined;
  buttonText?: string;
  buttonIcon?: HTMLElement;
};

const fileBlockImageIcon = document.createElement("div");
fileBlockImageIcon.innerHTML =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 11.1005L7 9.1005L12.5 14.6005L16 11.1005L19 14.1005V5H5V11.1005ZM4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3ZM15.5 10C14.6716 10 14 9.32843 14 8.5C14 7.67157 14.6716 7 15.5 7C16.3284 7 17 7.67157 17 8.5C17 9.32843 16.3284 10 15.5 10Z"></path></svg>';
export const fileBlockImageExtension: FileBlockExtension = {
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
  render: renderImageFile,
  toExternalHTML: undefined,
  parse: undefined,
  buttonText: "image",
  buttonIcon: fileBlockImageIcon.firstElementChild as HTMLElement,
};
