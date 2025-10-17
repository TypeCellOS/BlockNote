import { FileBlockConfig } from "@blocknote/core";
import { RiFile2Line } from "react-icons/ri";

import { baseFilePropSchema } from "../../../../../../core/src/blocks/defaultFileProps.js";
import { ReactCustomBlockRenderProps } from "../../../../schema/ReactBlockSpec.js";

export const FileNameWithIcon = (
  props: Omit<
    ReactCustomBlockRenderProps<
      FileBlockConfig["type"],
      typeof baseFilePropSchema,
      FileBlockConfig["content"]
    >,
    "editor" | "contentRef"
  >,
) => (
  <div
    className={"bn-file-name-with-icon"}
    contentEditable={false}
    draggable={false}
  >
    <div className={"bn-file-icon"}>
      <RiFile2Line size={24} />
    </div>
    <p className={"bn-file-name"}>{props.block.props.name}</p>
  </div>
);
