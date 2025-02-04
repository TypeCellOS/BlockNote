import { InlineContentSchema, StyleSchema } from "@blocknote/core";
import { BlockNoteViewProps, Components } from "@blocknote/react";
import { ShadCNComponents } from "./ShadCNComponentsContext.js";
import "./style.css";
export declare const components: Components;
export declare const BlockNoteView: <BSchema extends Record<string, import("@blocknote/core").BlockConfig>, ISchema extends InlineContentSchema, SSchema extends StyleSchema>(props: BlockNoteViewProps<BSchema, ISchema, SSchema> & {
    /**
     * (optional)Provide your own shadcn component overrides
     */
    shadCNComponents?: Partial<ShadCNComponents>;
}) => import("react/jsx-runtime").JSX.Element;
