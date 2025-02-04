import { Exporter, InlineContentSchema, StyleSchema, TableContent } from "@blocknote/core";
export declare const Table: (props: {
    data: TableContent<InlineContentSchema>;
    transformer: Exporter<any, InlineContentSchema, StyleSchema, any, any, any, any>;
}) => import("react/jsx-runtime").JSX.Element;
