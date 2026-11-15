import type {
  BlockNoteEditorOptions,
  DefaultInlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { EmbedExtension } from "./EmbedExtension.js";
import type { EmbedsBlockSchema, EmbedsOptions } from "./types.js";

export function withEmbeds<
  BSchema extends EmbedsBlockSchema,
  ISchema extends DefaultInlineContentSchema,
  SSchema extends StyleSchema,
>({
  embeds,
  pasteHandler,
  ...options
}: Partial<BlockNoteEditorOptions<BSchema, ISchema, SSchema>> & {
  schema: BlockNoteEditorOptions<BSchema, ISchema, SSchema>["schema"];
  embeds: EmbedsOptions;
}): Partial<BlockNoteEditorOptions<BSchema, ISchema, SSchema>> & {
  schema: BlockNoteEditorOptions<BSchema, ISchema, SSchema>["schema"];
} {
  return {
    ...options,
    extensions: [...(options.extensions ?? []), EmbedExtension(embeds)],
    pasteHandler(context) {
      if (context.editor.getExtension(EmbedExtension)?.handlePaste(context)) {
        return true;
      }
      if (pasteHandler) {
        return pasteHandler(context);
      }
      return context.defaultPasteHandler();
    },
  };
}
