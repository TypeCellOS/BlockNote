import {
  audio,
  bulletListItem,
  checkListItem,
  codeBlock,
  file,
  heading,
  image,
  numberedListItem,
  pageBreak,
  paragraph,
  quoteBlock,
  toggleListItem,
  video,
} from "../blks/index.js";
import {
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "../blocks/defaultBlocks.js";
import {
  BlockDefinition,
  InlineContentSchema,
  InlineContentSchemaFromSpecs,
  InlineContentSpecs,
  PropSchema,
  StyleSchema,
  StyleSchemaFromSpecs,
  StyleSpecs,
} from "../schema/index.js";
import { CustomBlockNoteSchema } from "./CustomSchema.js";

const defaultBlockSpecs = {
  paragraph: paragraph.definition,
  audio: audio.definition,
  bulletListItem: bulletListItem.definition,
  checkListItem: checkListItem.definition,
  codeBlock: codeBlock.definition,
  heading: heading.definition,
  numberedListItem: numberedListItem.definition,
  pageBreak: pageBreak.definition,
  quoteBlock: quoteBlock.definition,
  toggleListItem: toggleListItem.definition,
  file: file.definition,
  image: image.definition,
  video: video.definition,
};

export class BlockNoteSchema2<
  BSpecs extends {
    [key in string]: BlockDefinition<key, PropSchema>;
  },
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
> extends CustomBlockNoteSchema<BSpecs, ISchema, SSchema> {
  public static create<
    BSpecs extends {
      [key in string]: BlockDefinition<key, PropSchema>;
    },
    ISpecs extends InlineContentSpecs = typeof defaultInlineContentSpecs,
    SSpecs extends StyleSpecs = typeof defaultStyleSpecs,
  >(options?: {
    /**
     * A list of custom block types that should be available in the editor.
     */
    blockSpecs?: BSpecs;
    /**
     * A list of custom InlineContent types that should be available in the editor.
     */
    inlineContentSpecs?: ISpecs;
    /**
     * A list of custom Styles that should be available in the editor.
     */
    styleSpecs?: SSpecs;
  }) {
    return new BlockNoteSchema2<
      Record<keyof BSpecs, BlockDefinition<string, PropSchema>>,
      InlineContentSchemaFromSpecs<ISpecs>,
      StyleSchemaFromSpecs<SSpecs>
    >({
      blockSpecs:
        options?.blockSpecs ??
        (Object.fromEntries(
          Object.entries(defaultBlockSpecs).map(([key, value]) => [
            key,
            value(({ ...options }[key] ?? {}) as never),
          ]),
        ) as any),
      inlineContentSpecs:
        options?.inlineContentSpecs ?? defaultInlineContentSpecs,
      styleSpecs: options?.styleSpecs ?? defaultStyleSpecs,
    });
  }
}
