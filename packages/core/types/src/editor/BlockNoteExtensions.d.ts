import type { BlockNoteEditor, BlockNoteExtension } from "./BlockNoteEditor.js";
import { Plugin } from "prosemirror-state";
import * as Y from "yjs";
import { BlockNoteDOMAttributes, BlockSchema, BlockSpecs, InlineContentSchema, InlineContentSpecs, StyleSchema, StyleSpecs } from "../schema/index.js";
type ExtensionOptions<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema> = {
    editor: BlockNoteEditor<BSchema, I, S>;
    domAttributes: Partial<BlockNoteDOMAttributes>;
    blockSpecs: BlockSpecs;
    inlineContentSpecs: InlineContentSpecs;
    styleSpecs: StyleSpecs;
    trailingBlock: boolean | undefined;
    collaboration?: {
        fragment: Y.XmlFragment;
        user: {
            name: string;
            color: string;
            [key: string]: string;
        };
        provider: any;
        renderCursor?: (user: any) => HTMLElement;
        showCursorLabels?: "always" | "activity";
    };
    disableExtensions: string[] | undefined;
    setIdAttribute?: boolean;
    animations: boolean;
    tableHandles: boolean;
    dropCursor: (opts: any) => Plugin;
    placeholders: Record<string | "default", string>;
    tabBehavior?: "prefer-navigate-ui" | "prefer-indent";
    sideMenuDetection: "viewport" | "editor";
};
/**
 * Get all the Tiptap extensions BlockNote is configured with by default
 */
export declare const getBlockNoteExtensions: <BSchema extends Record<string, import("../schema/index.js").BlockConfig>, I extends InlineContentSchema, S extends StyleSchema>(opts: ExtensionOptions<BSchema, I, S>) => Record<string, BlockNoteExtension>;
export {};
