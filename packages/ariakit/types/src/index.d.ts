import { InlineContentSchema, StyleSchema } from "@blocknote/core";
import { BlockNoteViewProps, Components } from "@blocknote/react";
import "./style.css";
export declare const components: Components;
export declare const BlockNoteView: <BSchema extends Record<string, import("@blocknote/core").BlockConfig>, ISchema extends InlineContentSchema, SSchema extends StyleSchema>(props: BlockNoteViewProps<BSchema, ISchema, SSchema>) => import("react/jsx-runtime").JSX.Element;
