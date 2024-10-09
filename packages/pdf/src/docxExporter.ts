import { Block } from "@blocknote/core";
import { docxBlockMappingForDefaultSchema } from "./docx/blocks";
import { docxInlineContentMappingForDefaultSchema } from "./docx/inlinecontent";
import {
  createDocxStyledTextTransformer,
  docxStyleMappingForDefaultSchema,
} from "./docx/styles";
import {
  createBlockTransformerFromMapping,
  createInlineContentTransformerFromMapping,
} from "./transformer";

export function createDocxExporterForDefaultSchema() {
  const styledTextTransformer = createDocxStyledTextTransformer(
    docxStyleMappingForDefaultSchema
  );

  const inlineContentTransformer = createInlineContentTransformerFromMapping(
    docxInlineContentMappingForDefaultSchema(styledTextTransformer)
  );

  const blockTransformer = createBlockTransformerFromMapping(
    docxBlockMappingForDefaultSchema(inlineContentTransformer)
  );

  return {
    util: {
      blockTransformer,
      styledTextTransformer,
      inlineContentTransformer,
    },
    transform: (block: Block[]) => {
      return block.map((b) => blockTransformer(b as any)); // TODO
    },
  };
}

// const extraBlockSchema = BlockNoteSchema.create({
//   blockSpecs: {
//     extraBlock: createBlockSpec(
//       {
//         type: "extraBlock",
//         content: "none",
//         propSchema: {},
//       },
//       {
//         render: () => ({} as any), // not used
//       }
//     ),
//     ...defaultBlockSpecs,
//   },
// });

// const { audio, ...rest } = defaultBlockSpecs;
// const removedBlockSchema = BlockNoteSchema.create({
//   blockSpecs: {
//     //first pass all the blockspecs from the built in, default block schema
//     ...rest,
//   },
// });

// mappingFactory(removedBlockSchema).createBlockMapping(
//   docxBlockMappingForDefaultSchema(ic)
//   //   extraBlock: () => ({}) as any,
// );
// // if (b.type === "")
