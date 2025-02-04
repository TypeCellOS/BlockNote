import { Props } from "../../schema/index.js";
export declare const pageBreakConfig: {
    type: "pageBreak";
    propSchema: {};
    content: "none";
    isFileBlock: false;
    isSelectable: false;
};
export declare const pageBreakRender: () => {
    dom: HTMLDivElement;
};
export declare const pageBreakParse: (element: HTMLElement) => Partial<Props<typeof pageBreakConfig.propSchema>> | undefined;
export declare const pageBreakToExternalHTML: () => {
    dom: HTMLDivElement;
};
export declare const PageBreak: {
    config: {
        type: "pageBreak";
        propSchema: {};
        content: "none";
        isFileBlock: false;
        isSelectable: false;
    };
    implementation: import("../../schema/index.js").TiptapBlockImplementation<{
        type: "pageBreak";
        propSchema: {};
        content: "none";
        isFileBlock: false;
        isSelectable: false;
    }, any, import("../../schema/index.js").InlineContentSchema, import("../../schema/index.js").StyleSchema>;
};
