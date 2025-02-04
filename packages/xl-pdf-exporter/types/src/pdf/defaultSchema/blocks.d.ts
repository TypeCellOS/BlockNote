/// <reference types="react" />
import { BlockMapping, DefaultBlockSchema, pageBreakSchema } from "@blocknote/core";
import { Link, Text } from "@react-pdf/renderer";
export declare const pdfBlockMappingForDefaultSchema: BlockMapping<DefaultBlockSchema & typeof pageBreakSchema.blockSchema, any, any, React.ReactElement<Text>, React.ReactElement<Text> | React.ReactElement<Link>>;
