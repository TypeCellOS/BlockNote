export declare const ColumnBlock: {
    config: {
        type: "column";
        content: "none";
        propSchema: {
            width: {
                default: number;
            };
        };
    };
    implementation: import("@blocknote/core").TiptapBlockImplementation<{
        type: "column";
        content: "none";
        propSchema: {
            width: {
                default: number;
            };
        };
    }, any, import("@blocknote/core").InlineContentSchema, import("@blocknote/core").StyleSchema>;
};
export declare const ColumnListBlock: {
    config: {
        type: "columnList";
        content: "none";
        propSchema: {};
    };
    implementation: import("@blocknote/core").TiptapBlockImplementation<{
        type: "columnList";
        content: "none";
        propSchema: {};
    }, any, import("@blocknote/core").InlineContentSchema, import("@blocknote/core").StyleSchema>;
};
