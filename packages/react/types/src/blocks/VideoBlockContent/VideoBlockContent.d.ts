import { FileBlockConfig, videoBlockConfig } from "@blocknote/core";
import { ReactCustomBlockRenderProps } from "../../schema/ReactBlockSpec.js";
export declare const VideoPreview: (props: Omit<ReactCustomBlockRenderProps<FileBlockConfig, any, any>, "contentRef">) => import("react/jsx-runtime").JSX.Element;
export declare const VideoToExternalHTML: (props: Omit<ReactCustomBlockRenderProps<typeof videoBlockConfig, any, any>, "contentRef">) => import("react/jsx-runtime").JSX.Element;
export declare const VideoBlock: (props: ReactCustomBlockRenderProps<typeof videoBlockConfig, any, any>) => import("react/jsx-runtime").JSX.Element;
export declare const ReactVideoBlock: {
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
    implementation: import("@blocknote/core").TiptapBlockImplementation<{
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
    }, any, import("@blocknote/core").InlineContentSchema, import("@blocknote/core").StyleSchema>;
};
