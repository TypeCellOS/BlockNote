/// <reference types="react" />
import { DefaultBlockSchema } from "@blocknote/core";
import { BlockMapping } from "@blocknote/core/src/exporter/mapping.js";
import { Link, Text } from "@react-pdf/renderer";
export declare const pdfBlockMappingForDefaultSchema: BlockMapping<DefaultBlockSchema, any, any, React.ReactElement<Text>, React.ReactElement<Text> | React.ReactElement<Link>>;
