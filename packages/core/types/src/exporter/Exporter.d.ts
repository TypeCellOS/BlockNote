import { BlockNoteSchema } from "../editor/BlockNoteSchema.js";
import { COLORS_DEFAULT } from "../editor/defaultColors.js";
import { BlockFromConfig, BlockSchema, InlineContent, InlineContentSchema, StyleSchema, StyledText, Styles } from "../schema/index.js";
import type { BlockMapping, InlineContentMapping, StyleMapping } from "./mapping.js";
export type ExporterOptions = {
    /**
     * A function that can be used to resolve files, images, etc.
     * Exporters might need the binary contents of files like images,
     * which might not always be available from the same origin as the main page.
     * You can use this option to proxy requests through a server you control
     * to avoid cross-origin (CORS) issues.
     *
     * @default uses a BlockNote hosted proxy (https://corsproxy.api.blocknotejs.org/)
     * @param url - The URL of the file to resolve
     * @returns A Promise that resolves to a string (the URL to use instead of the original)
     * or a Blob (you can return the Blob directly if you have already fetched it)
     */
    resolveFileUrl?: (url: string) => Promise<string | Blob>;
    /**
     * Colors to use for background of blocks, font colors, and highlight colors
     */
    colors: typeof COLORS_DEFAULT;
};
export declare abstract class Exporter<B extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema, RB, RI, RS, TS> {
    protected readonly mappings: {
        blockMapping: BlockMapping<B, I, S, RB, RI>;
        inlineContentMapping: InlineContentMapping<I, S, RI, TS>;
        styleMapping: StyleMapping<S, RS>;
    };
    readonly options: ExporterOptions;
    constructor(_schema: BlockNoteSchema<B, I, S>, // only used for type inference
    mappings: {
        blockMapping: BlockMapping<B, I, S, RB, RI>;
        inlineContentMapping: InlineContentMapping<I, S, RI, TS>;
        styleMapping: StyleMapping<S, RS>;
    }, options: ExporterOptions);
    resolveFile(url: string): Promise<Blob>;
    mapStyles(styles: Styles<S>): RS[];
    mapInlineContent(inlineContent: InlineContent<I, S>): RI;
    transformInlineContent(inlineContentArray: InlineContent<I, S>[]): RI[];
    abstract transformStyledText(styledText: StyledText<S>): TS;
    mapBlock(block: BlockFromConfig<B[keyof B], I, S>, nestingLevel: number, numberedListIndex: number): Promise<RB>;
}
