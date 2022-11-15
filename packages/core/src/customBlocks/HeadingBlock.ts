import { CustomBlock } from "./customBlock";

export const HeadingBlock: CustomBlock = {
  type: "heading",

  // atom: boolean;
  selectable: true,

  attributes: { level: "1" },

  element: (props) => {
    const element = document.createElement("div");
    const editableElement = document.createElement(
      "h" + props.HTMLAttributes["level"]
    );
    element.appendChild(editableElement);

    return {
      element: element,
      editable: editableElement,
    };
  },
};
