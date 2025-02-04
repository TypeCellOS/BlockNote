import { BlockNoteEditor, BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import React, { HTMLAttributes, ReactNode, Ref } from "react";
import { BlockNoteDefaultUIProps } from "./BlockNoteDefaultUI.js";
import "./styles.css";
export type BlockNoteViewProps<BSchema extends BlockSchema, ISchema extends InlineContentSchema, SSchema extends StyleSchema> = {
    editor: BlockNoteEditor<BSchema, ISchema, SSchema>;
    theme?: "light" | "dark";
    /**
     * Locks the editor from being editable by the user if set to `false`.
     */
    editable?: boolean;
    /**
     * A callback function that runs whenever the text cursor position or selection changes.
     */
    onSelectionChange?: () => void;
    /**
     * A callback function that runs whenever the editor's contents change.
     */
    onChange?: () => void;
    children?: ReactNode;
    ref?: Ref<HTMLDivElement> | undefined;
} & Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "onSelectionChange" | "children"> & BlockNoteDefaultUIProps;
declare function BlockNoteViewComponent<BSchema extends BlockSchema, ISchema extends InlineContentSchema, SSchema extends StyleSchema>(props: BlockNoteViewProps<BSchema, ISchema, SSchema>, ref: React.Ref<HTMLDivElement>): import("react/jsx-runtime").JSX.Element;
export declare const BlockNoteViewRaw: <BSchema extends Record<string, import("@blocknote/core").BlockConfig>, ISchema extends InlineContentSchema, SSchema extends StyleSchema>(props: BlockNoteViewProps<BSchema, ISchema, SSchema> & {
    ref?: React.ForwardedRef<HTMLDivElement>;
}) => ReturnType<typeof BlockNoteViewComponent<BSchema, ISchema, SSchema>>;
export {};
