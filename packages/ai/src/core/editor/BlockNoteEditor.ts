import {
  BlockNoteEditor as BlockNoteCoreEditor,
  BlockNoteEditorOptions as BlockNoteCoreEditorOptions,
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
import { Dictionary } from "../i18n/dictionary";
import { en } from "../i18n/locales";
// import { checkDefaultBlockTypeInSchema } from "../blocks/defaultBlockTypeGuards";

export type BlockNoteEditorOptions<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
> = Omit<
  BlockNoteCoreEditorOptions<BSchema, ISchema, SSchema>,
  "dictionary"
> & {
  dictionary?: Dictionary;
};

export class BlockNoteEditor<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema
> extends BlockNoteCoreEditor<BSchema, ISchema, SSchema> {
  public declare dictionary: Dictionary;

  public readonly aiBlockToolbar?: AIBlockToolbarProsemirrorPlugin =
    new AIBlockToolbarProsemirrorPlugin();
  public readonly aiInlineToolbar: AIInlineToolbarProsemirrorPlugin =
    new AIInlineToolbarProsemirrorPlugin();

  public toolbars: Record<string, any>;

  protected constructor(
    protected readonly options: Partial<BlockNoteEditorOptions<any, any, any>>
  ) {
    super({
      schema: BlockNoteSchema.create({
        blockSpecs: defaultBlockSpecs,
      }),
      ...options,
      dictionary: options.dictionary || en,
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
