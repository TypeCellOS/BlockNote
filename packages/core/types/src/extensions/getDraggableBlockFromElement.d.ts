import { EditorView } from "prosemirror-view";
export declare function getDraggableBlockFromElement(element: Element, view: EditorView): {
    node: HTMLElement;
    id: string;
} | undefined;
