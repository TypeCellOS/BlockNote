/// <reference types="react" />
import { BlockNoteEditor } from "@blocknote/core";
export declare function renderToDOMSpec(fc: (refCB: (ref: HTMLElement | null) => void) => React.ReactNode, editor: BlockNoteEditor<any, any, any> | undefined): {
    dom: HTMLSpanElement;
    contentDOM?: undefined;
} | {
    dom: HTMLElement;
    contentDOM: HTMLElement | undefined;
};
