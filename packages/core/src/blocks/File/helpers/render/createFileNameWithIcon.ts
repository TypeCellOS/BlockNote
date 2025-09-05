import {
  BlockConfig,
  BlockFromConfigNoChildren,
} from "../../../../schema/index.js";

export const FILE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 8L9.00319 2H19.9978C20.5513 2 21 2.45531 21 2.9918V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5501 3 20.9932V8ZM10 4V9H5V20H19V4H10Z"></path></svg>`;

export const createFileNameWithIcon = (
  block: BlockFromConfigNoChildren<
    BlockConfig<
      string,
      {
        name: { default: "" };
      },
      "none"
    >,
    any,
    any
  >,
): { dom: HTMLElement; destroy?: () => void } => {
  const file = document.createElement("div");
  file.className = "bn-file-name-with-icon";

  const icon = document.createElement("div");
  icon.className = "bn-file-icon";
  icon.innerHTML = FILE_ICON_SVG;
  file.appendChild(icon);

  const fileName = document.createElement("p");
  fileName.className = "bn-file-name";
  fileName.textContent = block.props.name;
  file.appendChild(fileName);

  return {
    dom: file,
  };
};
