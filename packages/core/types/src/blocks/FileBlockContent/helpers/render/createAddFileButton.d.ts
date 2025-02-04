import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { BlockFromConfig, FileBlockConfig } from "../../../../schema/index.js";
export declare const createAddFileButton: (block: BlockFromConfig<FileBlockConfig, any, any>, editor: BlockNoteEditor<any, any, any>, buttonText?: string, buttonIcon?: HTMLElement) => {
    dom: HTMLDivElement;
    destroy: () => void;
};
