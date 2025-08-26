import { createFileBlockConfig, fileParse } from "@blocknote/core";

import { createReactBlockSpec } from "../../schema/ReactBlockSpec.js";
import { FileBlockWrapper } from "./helpers/render/FileBlockWrapper.js";
import { LinkWithCaption } from "./helpers/toExternalHTML/LinkWithCaption.js";

export const ReactFileBlock = createReactBlockSpec(createFileBlockConfig, {
  render: (props) => <FileBlockWrapper {...props} />,
  parse: fileParse(),
  toExternalHTML: (props) => {
    if (!props.block.props.url) {
      return <p>Add file</p>;
    }

    const link = (
      <a href={props.block.props.url}>
        {props.block.props.name || props.block.props.url}
      </a>
    );

    if (props.block.props.caption) {
      return (
        <LinkWithCaption caption={props.block.props.caption}>
          {link}
        </LinkWithCaption>
      );
    }

    return link;
  },
});
