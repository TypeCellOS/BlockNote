import { Block } from "@blocknote/core";
import { Paragraph, TextRun } from "docx";
export declare function createDocxExporterForDefaultSchema(): {
    util: {
        blockTransformer: (block: import("@blocknote/core").BlockFromConfig<{
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
        } | {
            type: "heading";
            content: "inline";
            propSchema: {
                level: {
                    default: number;
                    values: readonly [1, 2, 3];
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
        } | {
            type: "bulletListItem";
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
        } | {
            type: "numberedListItem";
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
        } | {
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
        } | {
            type: "table";
            content: "table";
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
        } | {
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
        } | {
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
        } | {
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
        } | {
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
        }, import("@blocknote/core").InlineContentSchema, import("@blocknote/core").StyleSchema>) => Paragraph;
        styledTextTransformer: (styledText: import("@blocknote/core").StyledText<import("@blocknote/core").StyleSchemaFromSpecs<{
            bold: {
                config: {
                    type: string;
                    propSchema: "boolean";
                };
                implementation: import("@blocknote/core").StyleImplementation;
            };
            italic: {
                config: {
                    type: string;
                    propSchema: "boolean";
                };
                implementation: import("@blocknote/core").StyleImplementation;
            };
            underline: {
                config: {
                    type: string;
                    propSchema: "boolean";
                };
                implementation: import("@blocknote/core").StyleImplementation;
            };
            strike: {
                config: {
                    type: string;
                    propSchema: "boolean";
                };
                implementation: import("@blocknote/core").StyleImplementation;
            };
            code: {
                config: {
                    type: string;
                    propSchema: "boolean";
                };
                implementation: import("@blocknote/core").StyleImplementation;
            };
            textColor: {
                config: {
                    type: string;
                    propSchema: "string";
                };
                implementation: import("@blocknote/core").StyleImplementation;
            };
            backgroundColor: {
                config: {
                    type: string;
                    propSchema: "string";
                };
                implementation: import("@blocknote/core").StyleImplementation;
            };
        }>>) => TextRun;
        inlineContentTransformer: (inlineContent: import("@blocknote/core").StyledText<import("@blocknote/core").StyleSchema> | import("@blocknote/core").Link<import("@blocknote/core").StyleSchema>) => import("docx").ParagraphChild;
    };
    transform: (blocks: Block[]) => Paragraph[];
};
