import { BubbleMenuFactory } from "@blocknote/core";
import { createButton } from "./util";

/**
 * This menu is drawn when a piece of text is selected. We can use it to change formatting options
 * such as bold, italic, indentation, etc.
 */
export const bubbleMenuFactory: BubbleMenuFactory = (props) => {
  const container = document.createElement("div");
  container.style.background = "gray";
  container.style.position = "absolute";
  container.style.padding = "10px";
  container.style.opacity = "0.8";
  const boldBtn = createButton("set bold", () => {
    props.toggleBold();
  });
  container.appendChild(boldBtn);

  const linkBtn = createButton("set link", () => {
    props.setHyperlink("https://www.google.com");
  });

  container.appendChild(boldBtn);
  container.appendChild(linkBtn);
  document.body.appendChild(container);

  return {
    element: container,
    show: (params) => {
      container.style.display = "block";
      console.log("show", params);
      boldBtn.text = params.boldIsActive ? "unset bold" : "set bold";
      container.style.top = params.selectionBoundingBox.y + "px";
      container.style.left = params.selectionBoundingBox.x + "px";
    },
    hide: () => {
      container.style.display = "none";
    },
    update: (params) => {
      console.log("update", params);
      boldBtn.text = params.boldIsActive ? "unset bold" : "set bold";
      container.style.top = params.selectionBoundingBox.y + "px";
      container.style.left = params.selectionBoundingBox.x + "px";
    },
  };
};
