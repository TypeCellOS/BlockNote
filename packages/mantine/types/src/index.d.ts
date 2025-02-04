import { InlineContentSchema, StyleSchema } from "@blocknote/core";
import { BlockNoteViewProps, Components } from "@blocknote/react";
import { Theme } from "./BlockNoteTheme.js";
import "./style.css";
export * from "./BlockNoteTheme.js";
export * from "./defaultThemes.js";
export declare const components: Components;
export declare const BlockNoteView: <BSchema extends Record<string, import("@blocknote/core").BlockConfig>, ISchema extends InlineContentSchema, SSchema extends StyleSchema>(props: Omit<BlockNoteViewProps<BSchema, ISchema, SSchema>, "theme"> & {
    theme?: "light" | "dark" | Theme | {
        light: Theme;
        dark: Theme;
    };
}) => import("react/jsx-runtime").JSX.Element;
