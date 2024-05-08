import { BlockFromConfig } from "../../schema";
import { fileBlockConfig } from "./fileBlockConfig";

export const renderDefaultFile = (
  block: BlockFromConfig<typeof fileBlockConfig, any, any>
): { dom: HTMLElement; destroy?: () => void } => {
  const file = document.createElement("div");
  file.className = "bn-file";
  file.contentEditable = "false";
  file.draggable = false;
  file.style.width = "100%";
  file.innerText = block.props.url.split("/").pop() || "";

  return {
    dom: file,
  };
};
