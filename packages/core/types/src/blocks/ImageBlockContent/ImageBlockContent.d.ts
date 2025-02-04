import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockFromConfig, Props } from "../../schema/index.js";
export declare const FILE_IMAGE_ICON_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M5 11.1005L7 9.1005L12.5 14.6005L16 11.1005L19 14.1005V5H5V11.1005ZM4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3ZM15.5 10C14.6716 10 14 9.32843 14 8.5C14 7.67157 14.6716 7 15.5 7C16.3284 7 17 7.67157 17 8.5C17 9.32843 16.3284 10 15.5 10Z\"></path></svg>";
export declare const imagePropSchema: {
    textAlignment: {
        default: "left";
        values: readonly ["left", "center", "right", "justify"];
    };
    backgroundColor: {
        default: "default";
    };
    name: {
        default: "";
    };
    url: {
        default: "";
    };
    caption: {
        default: "";
    };
    showPreview: {
        default: true;
    };
    previewWidth: {
        default: number;
    };
};
export declare const imageBlockConfig: {
    type: "image";
    propSchema: {
        textAlignment: {
            default: "left";
            values: readonly ["left", "center", "right", "justify"];
        };
        backgroundColor: {
            default: "default";
        };
        name: {
            default: "";
        };
        url: {
            default: "";
        };
        caption: {
            default: "";
        };
        showPreview: {
            default: true;
        };
        previewWidth: {
            default: number;
        };
    };
    content: "none";
    isFileBlock: true;
    fileBlockAccept: string[];
};
export declare const imageRender: (block: BlockFromConfig<typeof imageBlockConfig, any, any>, editor: BlockNoteEditor<any, any, any>) => {
    dom: HTMLElement;
    destroy: () => void;
};
export declare const imageParse: (element: HTMLElement) => Partial<Props<typeof imageBlockConfig.propSchema>> | undefined;
export declare const imageToExternalHTML: (block: BlockFromConfig<typeof imageBlockConfig, any, any>) => {
    dom: HTMLElement;
};
export declare const ImageBlock: {
    config: {
        type: "image";
        propSchema: {
            textAlignment: {
                default: "left";
                values: readonly ["left", "center", "right", "justify"];
            };
            backgroundColor: {
                default: "default";
            };
            name: {
                default: "";
            };
            url: {
                default: "";
            };
            caption: {
                default: "";
            };
            showPreview: {
                default: true;
            };
            previewWidth: {
                default: number;
            };
        };
        content: "none";
        isFileBlock: true;
        fileBlockAccept: string[];
    };
    implementation: import("../../schema/index.js").TiptapBlockImplementation<{
        type: "image";
        propSchema: {
            textAlignment: {
                default: "left";
                values: readonly ["left", "center", "right", "justify"];
            };
            backgroundColor: {
                default: "default";
            };
            name: {
                default: "";
            };
            url: {
                default: "";
            };
            caption: {
                default: "";
            };
            showPreview: {
                default: true;
            };
            previewWidth: {
                default: number;
            };
        };
        content: "none";
        isFileBlock: true;
        fileBlockAccept: string[];
    }, any, import("../../schema/index.js").InlineContentSchema, import("../../schema/index.js").StyleSchema>;
};
