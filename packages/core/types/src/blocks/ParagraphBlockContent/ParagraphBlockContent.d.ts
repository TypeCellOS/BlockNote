export declare const paragraphPropSchema: {
    backgroundColor: {
        default: "default";
    };
    textColor: {
        default: "default";
    };
    textAlignment: {
        default: "left";
        values: readonly ["left", "center", "right", "justify"];
    };
};
export declare const ParagraphBlockContent: import("@tiptap/core").Node<any, any> & {
    name: "paragraph";
    config: {
        content: "inline*";
    };
};
export declare const Paragraph: {
    config: {
        type: "paragraph";
        content: "inline";
        propSchema: {
            backgroundColor: {
                default: "default";
            };
            textColor: {
                default: "default";
            };
            textAlignment: {
                default: "left";
                values: readonly ["left", "center", "right", "justify"];
            };
        };
    };
    implementation: import("../../schema/index.js").TiptapBlockImplementation<{
        type: "paragraph";
        content: "inline";
        propSchema: {
            backgroundColor: {
                default: "default";
            };
            textColor: {
                default: "default";
            };
            textAlignment: {
                default: "left";
                values: readonly ["left", "center", "right", "justify"];
            };
        };
    }, any, import("../../schema/index.js").InlineContentSchema, import("../../schema/index.js").StyleSchema>;
};
