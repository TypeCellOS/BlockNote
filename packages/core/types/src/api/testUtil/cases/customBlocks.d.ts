import { EditorTestCases } from "../index.js";
import { DefaultInlineContentSchema, DefaultStyleSchema } from "../../../blocks/defaultBlocks.js";
import { BlockNoteSchema } from "../../../editor/BlockNoteSchema.js";
declare const schema: BlockNoteSchema<import("../../../schema/index.js").BlockSchemaFromSpecs<{
    simpleImage: {
        config: {
            type: string;
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
        };
        implementation: import("../../../schema/index.js").TiptapBlockImplementation<{
            type: string;
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
        }, any, import("../../../schema/index.js").InlineContentSchema, import("../../../schema/index.js").StyleSchema>;
    };
    customParagraph: {
        config: {
            type: string;
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
            content: "inline";
        };
        implementation: import("../../../schema/index.js").TiptapBlockImplementation<{
            type: string;
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
            content: "inline";
        }, any, import("../../../schema/index.js").InlineContentSchema, import("../../../schema/index.js").StyleSchema>;
    };
    simpleCustomParagraph: {
        config: {
            type: string;
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
            content: "inline";
        };
        implementation: import("../../../schema/index.js").TiptapBlockImplementation<{
            type: string;
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
            content: "inline";
        }, any, import("../../../schema/index.js").InlineContentSchema, import("../../../schema/index.js").StyleSchema>;
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
        implementation: import("../../../schema/index.js").TiptapBlockImplementation<{
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
        }, any, import("../../../schema/index.js").InlineContentSchema, import("../../../schema/index.js").StyleSchema>;
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
        implementation: import("../../../schema/index.js").TiptapBlockImplementation<{
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
        }, any, import("../../../schema/index.js").InlineContentSchema, import("../../../schema/index.js").StyleSchema>;
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
        implementation: import("../../../schema/index.js").TiptapBlockImplementation<{
            type: "codeBlock";
            content: "inline";
            propSchema: {
                language: {
                    default: string;
                    values: string[];
                };
            };
        }, any, import("../../../schema/index.js").InlineContentSchema, import("../../../schema/index.js").StyleSchema>;
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
        implementation: import("../../../schema/index.js").TiptapBlockImplementation<{
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
        }, any, import("../../../schema/index.js").InlineContentSchema, import("../../../schema/index.js").StyleSchema>;
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
        implementation: import("../../../schema/index.js").TiptapBlockImplementation<{
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
        }, any, import("../../../schema/index.js").InlineContentSchema, import("../../../schema/index.js").StyleSchema>;
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
        implementation: import("../../../schema/index.js").TiptapBlockImplementation<{
            type: "table";
            content: "table";
            propSchema: {
                textColor: {
                    default: "default";
                };
            };
        }, any, import("../../../schema/index.js").InlineContentSchema, import("../../../schema/index.js").StyleSchema>;
    };
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
        implementation: import("../../../schema/index.js").TiptapBlockImplementation<{
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
        }, any, import("../../../schema/index.js").InlineContentSchema, import("../../../schema/index.js").StyleSchema>;
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
        implementation: import("../../../schema/index.js").TiptapBlockImplementation<{
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
        }, any, import("../../../schema/index.js").InlineContentSchema, import("../../../schema/index.js").StyleSchema>;
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
        implementation: import("../../../schema/index.js").TiptapBlockImplementation<{
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
        }, any, import("../../../schema/index.js").InlineContentSchema, import("../../../schema/index.js").StyleSchema>;
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
        implementation: import("../../../schema/index.js").TiptapBlockImplementation<{
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
        }, any, import("../../../schema/index.js").InlineContentSchema, import("../../../schema/index.js").StyleSchema>;
    };
}>, import("../../../schema/index.js").InlineContentSchemaFromSpecs<{
    text: {
        config: "text";
        implementation: any;
    };
    link: {
        config: "link";
        implementation: any;
    };
}>, import("../../../schema/index.js").StyleSchemaFromSpecs<{
    bold: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("../../../schema/index.js").StyleImplementation;
    };
    italic: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("../../../schema/index.js").StyleImplementation;
    };
    underline: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("../../../schema/index.js").StyleImplementation;
    };
    strike: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("../../../schema/index.js").StyleImplementation;
    };
    code: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("../../../schema/index.js").StyleImplementation;
    };
    textColor: {
        config: {
            type: string;
            propSchema: "string";
        };
        implementation: import("../../../schema/index.js").StyleImplementation;
    };
    backgroundColor: {
        config: {
            type: string;
            propSchema: "string";
        };
        implementation: import("../../../schema/index.js").StyleImplementation;
    };
}>>;
export declare const customBlocksTestCases: EditorTestCases<typeof schema.blockSchema, DefaultInlineContentSchema, DefaultStyleSchema>;
export {};
