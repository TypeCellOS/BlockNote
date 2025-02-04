export declare const checkListItemPropSchema: {
    checked: {
        default: false;
    };
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
export declare const CheckListItem: {
    config: {
        type: "checkListItem";
        content: "inline";
        propSchema: {
            checked: {
                default: false;
            };
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
    implementation: import("../../../schema/index.js").TiptapBlockImplementation<{
        type: "checkListItem";
        content: "inline";
        propSchema: {
            checked: {
                default: false;
            };
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
    }, any, import("../../../schema/index.js").InlineContentSchema, import("../../../schema/index.js").StyleSchema>;
};
