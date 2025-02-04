/// <reference types="react" />
import { BlockNoteSchema, DefaultInlineContentSchema, DefaultStyleSchema, EditorTestCases } from "@blocknote/core";
export declare const TestContext: import("react").Context<true | undefined>;
declare const schema: BlockNoteSchema<import("@blocknote/core").BlockSchemaFromSpecs<{
    file: {
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
    image: {
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
        implementation: import("@blocknote/core").TiptapBlockImplementation<{
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
        }, any, import("@blocknote/core").InlineContentSchema, import("@blocknote/core").StyleSchema>;
    };
    reactCustomParagraph: {
        config: {
            readonly type: "reactCustomParagraph";
            readonly propSchema: {
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
            readonly content: "inline";
        };
        implementation: import("@blocknote/core").TiptapBlockImplementation<{
            readonly type: "reactCustomParagraph";
            readonly propSchema: {
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
            readonly content: "inline";
        }, any, import("@blocknote/core").InlineContentSchema, import("@blocknote/core").StyleSchema>;
    };
    simpleReactCustomParagraph: {
        config: {
            readonly type: "simpleReactCustomParagraph";
            readonly propSchema: {
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
            readonly content: "inline";
        };
        implementation: import("@blocknote/core").TiptapBlockImplementation<{
            readonly type: "simpleReactCustomParagraph";
            readonly propSchema: {
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
            readonly content: "inline";
        }, any, import("@blocknote/core").InlineContentSchema, import("@blocknote/core").StyleSchema>;
    };
    reactContextParagraph: {
        config: {
            readonly type: "reactContextParagraph";
            readonly propSchema: {
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
            readonly content: "inline";
        };
        implementation: import("@blocknote/core").TiptapBlockImplementation<{
            readonly type: "reactContextParagraph";
            readonly propSchema: {
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
            readonly content: "inline";
        }, any, import("@blocknote/core").InlineContentSchema, import("@blocknote/core").StyleSchema>;
    };
    paragraph: {
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
        implementation: import("@blocknote/core").TiptapBlockImplementation<{
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
        }, any, import("@blocknote/core").InlineContentSchema, import("@blocknote/core").StyleSchema>;
    };
    heading: {
        config: {
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
        };
        implementation: import("@blocknote/core").TiptapBlockImplementation<{
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
        }, any, import("@blocknote/core").InlineContentSchema, import("@blocknote/core").StyleSchema>;
    };
    codeBlock: {
        config: {
            type: "codeBlock";
            content: "inline";
            propSchema: {
                language: {
                    default: string;
                    values: string[];
                };
            };
        };
        implementation: import("@blocknote/core").TiptapBlockImplementation<{
            type: "codeBlock";
            content: "inline";
            propSchema: {
                language: {
                    default: string;
                    values: string[];
                };
            };
        }, any, import("@blocknote/core").InlineContentSchema, import("@blocknote/core").StyleSchema>;
    };
    bulletListItem: {
        config: {
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
        };
        implementation: import("@blocknote/core").TiptapBlockImplementation<{
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
        }, any, import("@blocknote/core").InlineContentSchema, import("@blocknote/core").StyleSchema>;
    };
    numberedListItem: {
        config: {
            type: "numberedListItem";
            content: "inline";
            propSchema: {
                start: {
                    default: undefined;
                    type: "number";
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
        implementation: import("@blocknote/core").TiptapBlockImplementation<{
            type: "numberedListItem";
            content: "inline";
            propSchema: {
                start: {
                    default: undefined;
                    type: "number";
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
        }, any, import("@blocknote/core").InlineContentSchema, import("@blocknote/core").StyleSchema>;
    };
    checkListItem: {
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
        implementation: import("@blocknote/core").TiptapBlockImplementation<{
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
        }, any, import("@blocknote/core").InlineContentSchema, import("@blocknote/core").StyleSchema>;
    };
    table: {
        config: {
            type: "table";
            content: "table";
            propSchema: {
                textColor: {
                    default: "default";
                };
            };
        };
        implementation: import("@blocknote/core").TiptapBlockImplementation<{
            type: "table";
            content: "table";
            propSchema: {
                textColor: {
                    default: "default";
                };
            };
        }, any, import("@blocknote/core").InlineContentSchema, import("@blocknote/core").StyleSchema>;
    };
    video: {
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
    audio: {
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
        implementation: import("@blocknote/core").TiptapBlockImplementation<{
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
        }, any, import("@blocknote/core").InlineContentSchema, import("@blocknote/core").StyleSchema>;
    };
}>, import("@blocknote/core").InlineContentSchemaFromSpecs<{
    text: {
        config: "text";
        implementation: any;
    };
    link: {
        config: "link";
        implementation: any;
    };
}>, import("@blocknote/core").StyleSchemaFromSpecs<{
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
}>>;
export declare const customReactBlockSchemaTestCases: EditorTestCases<typeof schema.blockSchema, DefaultInlineContentSchema, DefaultStyleSchema>;
export {};
