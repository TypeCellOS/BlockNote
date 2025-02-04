import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockFromConfig, Props } from "../../schema/index.js";
export declare const FILE_AUDIO_ICON_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M2 16.0001H5.88889L11.1834 20.3319C11.2727 20.405 11.3846 20.4449 11.5 20.4449C11.7761 20.4449 12 20.2211 12 19.9449V4.05519C12 3.93977 11.9601 3.8279 11.887 3.73857C11.7121 3.52485 11.3971 3.49335 11.1834 3.66821L5.88889 8.00007H2C1.44772 8.00007 1 8.44778 1 9.00007V15.0001C1 15.5524 1.44772 16.0001 2 16.0001ZM23 12C23 15.292 21.5539 18.2463 19.2622 20.2622L17.8445 18.8444C19.7758 17.1937 21 14.7398 21 12C21 9.26016 19.7758 6.80629 17.8445 5.15557L19.2622 3.73779C21.5539 5.75368 23 8.70795 23 12ZM18 12C18 10.0883 17.106 8.38548 15.7133 7.28673L14.2842 8.71584C15.3213 9.43855 16 10.64 16 12C16 13.36 15.3213 14.5614 14.2842 15.2841L15.7133 16.7132C17.106 15.6145 18 13.9116 18 12Z\"></path></svg>";
export declare const audioPropSchema: {
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
};
export declare const audioBlockConfig: {
    type: "audio";
    propSchema: {
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
    };
    content: "none";
    isFileBlock: true;
    fileBlockAccept: string[];
};
export declare const audioRender: (block: BlockFromConfig<typeof audioBlockConfig, any, any>, editor: BlockNoteEditor<any, any, any>) => {
    dom: HTMLElement;
    destroy?: (() => void) | undefined;
};
export declare const audioParse: (element: HTMLElement) => Partial<Props<typeof audioBlockConfig.propSchema>> | undefined;
export declare const audioToExternalHTML: (block: BlockFromConfig<typeof audioBlockConfig, any, any>) => {
    dom: HTMLElement;
};
export declare const AudioBlock: {
    config: {
        type: "audio";
        propSchema: {
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
        };
        content: "none";
        isFileBlock: true;
        fileBlockAccept: string[];
    };
    implementation: import("../../schema/index.js").TiptapBlockImplementation<{
        type: "audio";
        propSchema: {
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
        };
        content: "none";
        isFileBlock: true;
        fileBlockAccept: string[];
    }, any, import("../../schema/index.js").InlineContentSchema, import("../../schema/index.js").StyleSchema>;
};
