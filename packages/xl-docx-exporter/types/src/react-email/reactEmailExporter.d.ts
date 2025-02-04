import { Block, BlockNoteSchema, BlockSchema, InlineContentSchema, StyleSchema, StyledText } from "@blocknote/core";
import { Exporter, ExporterOptions } from "@blocknote/core";
import { Link } from "@react-email/components";
import { CSSProperties } from "react";
export declare class ReactEmailExporter<B extends BlockSchema, S extends StyleSchema, I extends InlineContentSchema> extends Exporter<B, I, S, React.ReactElement<any>, React.ReactElement<typeof Link> | React.ReactElement<HTMLSpanElement>, CSSProperties, React.ReactElement<HTMLSpanElement>> {
    readonly schema: BlockNoteSchema<B, I, S>;
    constructor(schema: BlockNoteSchema<B, I, S>, mappings: Exporter<NoInfer<B>, NoInfer<I>, NoInfer<S>, React.ReactElement<any>, React.ReactElement<typeof Link> | React.ReactElement<HTMLSpanElement>, CSSProperties, React.ReactElement<HTMLSpanElement>>["mappings"], options?: Partial<ExporterOptions>);
    transformStyledText(styledText: StyledText<S>): import("react/jsx-runtime").JSX.Element;
    transformBlocks(blocks: Block<B, I, S>[], // Or BlockFromConfig<B[keyof B], I, S>?
    nestingLevel?: number): React.ReactElement<Text>[];
    renderFonts(): import("react/jsx-runtime").JSX.Element;
    toReactEmailDocument(blocks: Block<B, I, S>[]): import("react/jsx-runtime").JSX.Element;
}
