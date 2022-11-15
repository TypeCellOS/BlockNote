import { CustomBlock } from "./customBlock";

export const ImageBlock: CustomBlock = {
  type: "image",
  atom: true,
  selectable: false,

  attributes: { src: "" },

  element: (props) => {
    console.log(props);
    const element = document.createElement("div");
    const imageElement = document.createElement("img");
    imageElement.setAttribute("src", props.HTMLAttributes["src"]);
    imageElement.setAttribute("draggable", "false");
    imageElement.setAttribute("user-select", "none");
    element.appendChild(imageElement);

    return {
      element: element,
    };
  },
};
