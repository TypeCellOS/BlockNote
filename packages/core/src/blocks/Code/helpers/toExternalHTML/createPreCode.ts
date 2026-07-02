import type { BlockFromConfig } from "../../../../schema/index.js";

export const createPreCode = (block: BlockFromConfig<any, any, any>) => {
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.className = `language-${block.props.language}`;
  code.dataset.language = block.props.language;
  pre.appendChild(code);

  return {
    dom: pre,
    contentDOM: code,
  };
};
