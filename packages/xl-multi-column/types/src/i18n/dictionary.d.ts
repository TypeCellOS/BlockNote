import type { en } from "./locales/index.js";
import { BlockNoteEditor } from "@blocknote/core";
export declare function getMultiColumnDictionary(editor: BlockNoteEditor<any, any, any>): {
    slash_menu: {
        two_columns: {
            title: string;
            subtext: string;
            aliases: string[];
            group: string;
        };
        three_columns: {
            title: string;
            subtext: string;
            aliases: string[];
            group: string;
        };
    };
};
export type MultiColumnDictionary = typeof en;
