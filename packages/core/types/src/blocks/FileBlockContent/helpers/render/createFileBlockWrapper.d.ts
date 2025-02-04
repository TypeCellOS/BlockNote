import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { BlockFromConfig, BlockSchemaWithBlock, FileBlockConfig } from "../../../../schema/index.js";
export declare const createFileBlockWrapper: (block: BlockFromConfig<FileBlockConfig, any, any>, editor: BlockNoteEditor<BlockSchemaWithBlock<FileBlockConfig["type"], FileBlockConfig>, any, any>, element?: {
    dom: HTMLElement;
    destroy?: () => void;
}, buttonText?: string, buttonIcon?: HTMLElement) => {
    dom: HTMLElement;
    destroy?: (() => void) | undefined;
};
