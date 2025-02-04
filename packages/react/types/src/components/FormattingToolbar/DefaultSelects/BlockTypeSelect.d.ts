import { Block, BlockSchema, Dictionary, InlineContentSchema, StyleSchema } from "@blocknote/core";
import type { IconType } from "react-icons";
export type BlockTypeSelectItem = {
    name: string;
    type: string;
    props?: Record<string, boolean | number | string>;
    icon: IconType;
    isSelected: (block: Block<BlockSchema, InlineContentSchema, StyleSchema>) => boolean;
    showWhileSelected?: boolean;
    showWhileNotSelected?: boolean;
};
export declare const blockTypeSelectItems: (dict: Dictionary) => BlockTypeSelectItem[];
export declare const BlockTypeSelect: (props: {
    items?: BlockTypeSelectItem[];
}) => import("react/jsx-runtime").JSX.Element | null;
