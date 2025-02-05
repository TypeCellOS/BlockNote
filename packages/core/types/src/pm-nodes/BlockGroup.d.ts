import { Node } from "@tiptap/core";
export declare const BlockGroup: Node<{
    domAttributes?: Partial<{
        blockGroup: Record<string, string>;
        blockContent: Record<string, string>;
        editor: Record<string, string>;
        block: Record<string, string>;
        inlineContent: Record<string, string>;
    }> | undefined;
}, any>;
