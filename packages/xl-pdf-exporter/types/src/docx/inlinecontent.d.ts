import { StyleSchema, StyledText } from "@blocknote/core";
import { ParagraphChild } from "docx";
export declare function docxInlineContentMappingForDefaultSchema(styledTextTransformer: (styledText: StyledText<StyleSchema>) => ParagraphChild): import("../mapping").InlineContentMapping<import("@blocknote/core").InlineContentSchemaFromSpecs<{
    text: {
        config: "text";
        implementation: any;
    };
    link: {
        config: "link";
        implementation: any;
    };
}>, StyleSchema, ParagraphChild>;
