import { Node } from "@tiptap/core";
export declare const BlockGroup: Node<{
    domAttributes?: Partial<{
        blockContent: Record<string, string>;
        blockGroup: Record<string, string>;
        editor: Record<string, string>;
        block: Record<string, string>;
        inlineContent: Record<string, string>;
    }> | undefined;
}, any>;
