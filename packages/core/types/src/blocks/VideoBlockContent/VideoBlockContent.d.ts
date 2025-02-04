import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockFromConfig, Props } from "../../schema/index.js";
export declare const FILE_VIDEO_ICON_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M2 3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934ZM8 5V19H16V5H8ZM4 5V7H6V5H4ZM18 5V7H20V5H18ZM4 9V11H6V9H4ZM18 9V11H20V9H18ZM4 13V15H6V13H4ZM18 13V15H20V13H18ZM4 17V19H6V17H4ZM18 17V19H20V17H18Z\"></path></svg>";
export declare const videoPropSchema: {
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
export declare const videoBlockConfig: {
    type: "video";
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
export declare const videoRender: (block: BlockFromConfig<typeof videoBlockConfig, any, any>, editor: BlockNoteEditor<any, any, any>) => {
    dom: HTMLElement;
    destroy: () => void;
};
export declare const videoParse: (element: HTMLElement) => Partial<Props<typeof videoBlockConfig.propSchema>> | undefined;
export declare const videoToExternalHTML: (block: BlockFromConfig<typeof videoBlockConfig, any, any>) => {
    dom: HTMLElement;
};
export declare const VideoBlock: {
    config: {
        type: "video";
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
        type: "video";
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
