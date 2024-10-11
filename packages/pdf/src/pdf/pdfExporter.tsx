import { Block } from "@blocknote/core";

import { Text, View } from "@react-pdf/renderer";

import {
  createBlockTransformerFromMapping,
  createInlineContentTransformerFromMapping,
} from "../transformer";
import { pdfBlockMappingForDefaultSchema } from "./blocks";
import { pdfInlineContentMappingForDefaultSchema } from "./inlinecontent";
import {
  createPdfStyledTextTransformer,
  pdfStyleMappingForDefaultSchema,
} from "./styles";

export function createPdfExporterForDefaultSchema() {
  const styledTextTransformer = createPdfStyledTextTransformer(
    pdfStyleMappingForDefaultSchema
  );

  const inlineContentTransformer = createInlineContentTransformerFromMapping(
    pdfInlineContentMappingForDefaultSchema(styledTextTransformer)
  );

  const blockTransformer = createBlockTransformerFromMapping(
    pdfBlockMappingForDefaultSchema(inlineContentTransformer)
  );

  const transform = (
    blocks: Block[],
    nestingLevel = 0
  ): React.ReactElement<Text>[] => {
    return blocks.map((b) => {
      const children = transform(b.children, nestingLevel + 1);
      const self = blockTransformer(b as any, nestingLevel);

      return (
        <>
          {self}
          {children.length > 0 && (
            <View style={{ marginLeft: 10 }}>{children}</View>
          )}
        </>
      );
    });
  };

  return {
    util: {
      blockTransformer,
      styledTextTransformer,
      inlineContentTransformer,
    },
    transform,
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
