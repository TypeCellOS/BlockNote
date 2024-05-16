import {
  BlockFromConfig,
  BlockNoteEditor,
  BlockSchemaWithBlock,
  DefaultBlockSchema,
  fileBlockConfig,
  audioParse,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { RiVolumeUpFill } from "react-icons/ri";

import { ReactFileBlockExtension } from "../reactFileBlockExtension";

const AudioRender = <
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(props: {
  block: BlockFromConfig<DefaultBlockSchema["file"], ISchema, SSchema>;
  editor: BlockNoteEditor<
    BlockSchemaWithBlock<"file", DefaultBlockSchema["file"]>,
    ISchema,
    SSchema
  >;
}) => {
  return (
    <audio
      className={"bn-audio"}
      src={props.block.props.url}
      contentEditable={false}
      controls={true}
      draggable={false}
    />
  );
};

const AudioToExternalHTML = (props: {
  block: BlockFromConfig<typeof fileBlockConfig, any, any>;
}) => {
  const audio = <audio src={props.block.props.url} />;

  if (props.block.props.caption) {
    return (
      <figure>
        {audio}
        <figcaption>{props.block.props.caption}</figcaption>
      </figure>
    );
  }

  return audio;
};

export const reactAudioFileExtension: ReactFileBlockExtension = {
  fileEndings: ["flac", "mp3", "wav"],
  render: AudioRender,
  parse: audioParse,
  toExternalHTML: AudioToExternalHTML,
  buttonText: "audio",
  buttonIcon: <RiVolumeUpFill size={24} />,
};
