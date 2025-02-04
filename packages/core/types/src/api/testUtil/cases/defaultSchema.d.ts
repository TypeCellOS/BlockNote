import { EditorTestCases } from "../index.js";
import { DefaultBlockSchema, DefaultInlineContentSchema, DefaultStyleSchema } from "../../../blocks/defaultBlocks.js";
import { pageBreakSchema } from "../../../blocks/PageBreakBlockContent/schema.js";
export declare const defaultSchemaTestCases: EditorTestCases<DefaultBlockSchema & typeof pageBreakSchema.blockSchema, DefaultInlineContentSchema, DefaultStyleSchema>;
