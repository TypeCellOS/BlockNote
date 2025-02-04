import { BlockNoteEditor, DefaultBlockSchema, DefaultInlineContentSchema, DefaultStyleSchema, InlineContentSchema, StyleSchema, TableHandlesState } from "@blocknote/core";
export type ExtendButtonProps<I extends InlineContentSchema = DefaultInlineContentSchema, S extends StyleSchema = DefaultStyleSchema> = {
    editor: BlockNoteEditor<{
        table: DefaultBlockSchema["table"];
    }, I, S>;
    onMouseDown: () => void;
    onMouseUp: () => void;
    orientation: "addOrRemoveRows" | "addOrRemoveColumns";
} & Pick<TableHandlesState<I, S>, "block">;
