import { CustomBlock } from "./customBlock";
import styles from "../extensions/Blocks/nodes/Block.module.css";

export const TextBlock: CustomBlock = {
  type: "content",

  className: styles.blockContent,
  priority: 1000,

  element: (_props) => {
    const element = document.createElement("div");
    const editableElement = document.createElement("div");
    element.appendChild(editableElement);

    return {
      element: element,
      editable: editableElement,
    };
  },
};
