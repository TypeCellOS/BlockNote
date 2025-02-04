import { fileBlockConfig } from "@blocknote/core";
import { ReactCustomBlockRenderProps } from "../../schema/ReactBlockSpec.js";
export declare const FileToExternalHTML: (props: Omit<ReactCustomBlockRenderProps<typeof fileBlockConfig, any, any>, "contentRef">) => import("react/jsx-runtime").JSX.Element;
export declare const FileBlock: (props: ReactCustomBlockRenderProps<typeof fileBlockConfig, any, any>) => import("react/jsx-runtime").JSX.Element;
export declare const ReactFileBlock: {
    config: {
        type: "file";
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
        };
        content: "none";
        isFileBlock: true;
    };
    implementation: import("@blocknote/core").TiptapBlockImplementation<{
        type: "file";
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
        };
        content: "none";
        isFileBlock: true;
    }, any, import("@blocknote/core").InlineContentSchema, import("@blocknote/core").StyleSchema>;
};
