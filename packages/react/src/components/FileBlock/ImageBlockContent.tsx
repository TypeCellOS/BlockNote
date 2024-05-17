import {
  BlockFromConfig,
  BlockNoteEditor,
  BlockSchemaWithBlock,
  fileParse,
  imageBlockConfig,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { useState } from "react";
import { createReactBlockSpec } from "../../schema/ReactBlockSpec";
import { ResizeHandlesWrapper } from "./extensions/utils/ResizeHandlesWrapper";
import { FileAndCaption, FileAndPlaceholder } from "./fileBlockHelpers";

const ImageRender = <
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(props: {
  block: BlockFromConfig<typeof imageBlockConfig, ISchema, SSchema>;
  editor: BlockNoteEditor<
    BlockSchemaWithBlock<"image", typeof imageBlockConfig>,
    ISchema,
    SSchema
  >;
}) => {
  const [width, setWidth] = useState<number>(
    Math.min(
      props.block.props.previewWidth,
      props.editor.domElement.firstElementChild!.clientWidth
    )
  );

  return (
    <ResizeHandlesWrapper {...props} width={width} setWidth={setWidth}>
      <img
        className={"bn-visual-media"}
        src={props.block.props.url}
        alt={props.block.props.caption || "BlockNote image"}
        contentEditable={false}
        draggable={false}
        width={width}
      />
    </ResizeHandlesWrapper>
  );
};

export const ReactImageBlock = createReactBlockSpec(imageBlockConfig, {
  render: (props) => (
    <div className={"bn-file-block-content-wrapper"}>
      {props.block.props.url === "" ? (
        // // TODO: pass image related things
        <FileAndPlaceholder {...props} editor={props.editor as any} />
      ) : !props.block.props.showPreview ? (
        <FileAndCaption {...props} editor={props.editor as any}>
          <div>TODO</div>
          {/* TODO */}
          {/* <ImageRender block={props.block} editor={props.editor} /> */}
        </FileAndCaption>
      ) : (
        <FileAndCaption {...props} editor={props.editor as any}>
          <ImageRender block={props.block} editor={props.editor as any} />
        </FileAndCaption>
      )}
    </div>
  ),
  parse: (element) => fileParse(element),
  // toExternalHTML: (props) => <FileToExternalHTML {...props} />,
});
