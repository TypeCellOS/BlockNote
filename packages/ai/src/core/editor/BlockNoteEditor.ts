import {
  BlockNoteEditor as BlockNoteCoreEditor,
  BlockNoteEditorOptions,
  BlockNoteSchema,
  BlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { Extension } from "@tiptap/core";

import { DefaultBlockSchema, defaultBlockSpecs } from "../blocks/defaultBlocks";
import { AIBlockToolbarProsemirrorPlugin } from "../extensions/AIBlockToolbar/AIBlockToolbarPlugin";
import { AIInlineToolbarProsemirrorPlugin } from "../extensions/AIInlineToolbar/AIInlineToolbarPlugin";
// import { checkDefaultBlockTypeInSchema } from "../blocks/defaultBlockTypeGuards";

export class BlockNoteEditor<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema
> extends BlockNoteCoreEditor<BSchema, ISchema, SSchema> {
  public readonly aiBlockToolbar?: AIBlockToolbarProsemirrorPlugin =
    new AIBlockToolbarProsemirrorPlugin();
  public readonly aiInlineToolbar: AIInlineToolbarProsemirrorPlugin =
    new AIInlineToolbarProsemirrorPlugin();

  protected constructor(
    protected readonly options: Partial<BlockNoteEditorOptions<any, any, any>>
  ) {
    super({
      schema: BlockNoteSchema.create({
        blockSpecs: defaultBlockSpecs,
      }),
      ...options,
      _tiptapOptions: {
        extensions: [
          Extension.create({
            name: "BlockNoteAIUIExtension",

            addProseMirrorPlugins: () => {
              return [
                ...(this.aiBlockToolbar ? [this.aiBlockToolbar.plugin] : []),
                this.aiInlineToolbar.plugin,
              ];
            },
          }),
        ],
        ...options._tiptapOptions,
      },
    });

    // if (checkDefaultBlockTypeInSchema("ai", this)) {
    //   this.aiBlockToolbar = new AIBlockToolbarProsemirrorPlugin();
    // }
    //
    // this.aiInlineToolbar = new AIInlineToolbarProsemirrorPlugin();
  }

  public static create<
    BSchema extends BlockSchema = DefaultBlockSchema,
    ISchema extends InlineContentSchema = DefaultInlineContentSchema,
    SSchema extends StyleSchema = DefaultStyleSchema
  >(options: Partial<BlockNoteEditorOptions<BSchema, ISchema, SSchema>> = {}) {
    return new BlockNoteEditor<BSchema, ISchema, SSchema>(options);
  }
}
