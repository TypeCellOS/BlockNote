import {
  BlockFromConfig,
  BlockSchemaWithBlock,
  PartialBlockFromConfig,
} from "../../schema";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { fileBlockConfig } from "./fileBlockConfig";

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
  parse?: (
    element: HTMLElement
  ) =>
    | PartialBlockFromConfig<typeof fileBlockConfig, any, any>["props"]
    | undefined;
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
  buttonText?: string;
  buttonIcon?: () => HTMLElement;
};
