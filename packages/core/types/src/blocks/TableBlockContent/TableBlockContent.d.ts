import { Node } from "@tiptap/core";
export declare const tablePropSchema: {
    textColor: {
        default: "default";
    };
};
export declare const TableBlockContent: Node<any, any> & {
    name: "table";
    config: {
        content: "tableRow+";
    };
};
export declare const Table: {
    config: {
        type: "table";
        content: "table";
        propSchema: {
            textColor: {
                default: "default";
            };
        };
    };
    implementation: import("../../schema/index.js").TiptapBlockImplementation<{
        type: "table";
        content: "table";
        propSchema: {
            textColor: {
                default: "default";
            };
        };
    }, any, import("../../schema/index.js").InlineContentSchema, import("../../schema/index.js").StyleSchema>;
};
