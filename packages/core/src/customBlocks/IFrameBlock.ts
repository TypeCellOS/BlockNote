import { CustomBlock } from "./customBlock";

export const IFrameBlock: CustomBlock = {
  type: "iframe",
  atom: true,
  selectable: false,

  attributes: { src: undefined },

  element: (props) => {
    const element = document.createElement("div");

    const editableElement = document.createElement("div");
    element.appendChild(editableElement);

    const editorElement = document.createElement("iframe");
    editorElement.setAttribute("src", props.HTMLAttributes["src"]);
    editorElement.setAttribute(
      "style",
      "width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
    );
    editorElement.setAttribute("title", "interesting-pine-gbk0pb");
    editorElement.setAttribute(
      "allow",
      "accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
    );
    editorElement.setAttribute(
      "sandbox",
      "allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
    );
    element.appendChild(editorElement);

    return {
      element: element,
      editable: editableElement,
    };
  },
};
