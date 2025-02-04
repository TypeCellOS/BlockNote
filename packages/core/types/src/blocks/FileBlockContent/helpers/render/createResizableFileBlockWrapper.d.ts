import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { BlockFromConfig, FileBlockConfig } from "../../../../schema/index.js";
export declare const createResizableFileBlockWrapper: (block: BlockFromConfig<FileBlockConfig, any, any>, editor: BlockNoteEditor<any, any, any>, element: {
    dom: HTMLElement;
    destroy?: () => void;
}, resizeHandlesContainerElement: HTMLElement, buttonText: string, buttonIcon: HTMLElement) => {
    dom: HTMLElement;
    destroy: () => void;
};
