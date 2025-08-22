import { createFileBlockConfig } from "@blocknote/core";
import { RiFile2Line } from "react-icons/ri";

import { ReactCustomBlockRenderProps } from "../../../../schema/ReactBlockSpec.js";

export const FileNameWithIcon = (
  props: Omit<
    ReactCustomBlockRenderProps<
      ReturnType<typeof createFileBlockConfig>["type"],
      ReturnType<typeof createFileBlockConfig>["propSchema"],
      ReturnType<typeof createFileBlockConfig>["content"]
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
