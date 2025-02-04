/// <reference types="react" />
import { StyleSchema, StyledText } from "@blocknote/core";
import { Link, Text } from "@react-pdf/renderer";
export declare function docxInlineContentMappingForDefaultSchema(styledTextTransformer: (styledText: StyledText<StyleSchema>) => React.ReactElement<Text>): import("../mapping").InlineContentMapping<import("@blocknote/core").InlineContentSchemaFromSpecs<{
    text: {
        config: "text";
        implementation: any;
    };
    link: {
        config: "link";
        implementation: any;
    };
}>, StyleSchema, import("react").ReactElement<Text, string | import("react").JSXElementConstructor<any>> | import("react").ReactElement<Link, string | import("react").JSXElementConstructor<any>>>;
