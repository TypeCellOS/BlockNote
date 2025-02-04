import { BlockNoteEditor } from "@blocknote/core";
/**
 * Replacement of https://github.com/ueberdosis/tiptap/blob/6676c7e034a46117afdde560a1b25fe75411a21d/packages/react/src/EditorContent.tsx
 * that only takes care of the Portals.
 *
 * Original implementation is messy, and we use a "mount" system in BlockNoteTiptapEditor.tsx that makes this cleaner
 */
export declare function EditorContent(props: {
    editor: BlockNoteEditor<any, any, any>;
    children: any;
}): import("react/jsx-runtime").JSX.Element;
