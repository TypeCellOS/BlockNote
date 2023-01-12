import { HyperlinkMenuFactory } from "@blocknote/core";
import { createButton } from "./util";

/**
 * This menu is drawn when the cursor is moved to a hyperlink (using the keyboard),
 * or when the mouse is hovering over a hyperlink
 */
export const hyperlinkMenuFactory: HyperlinkMenuFactory = (props) => {
  const container = document.createElement("div");
  container.style.background = "gray";
  container.style.position = "absolute";
  container.style.padding = "10px";
  container.style.opacity = "0.8";

  const editBtn = createButton("edit", () => {
    const newUrl = prompt("new url") || props.url;
    props.editHyperlink(newUrl, props.text);
  });
  container.appendChild(editBtn);

  const removeBtn = createButton("remove", () => {
    props.deleteHyperlink();
  });

  container.appendChild(editBtn);
  container.appendChild(removeBtn);
  document.body.appendChild(container);

  return {
    element: container,
    show: (params) => {
      container.style.display = "block";
      console.log("show", params);

      container.style.top = params.boundingBox.y + "px";
      container.style.left = params.boundingBox.x + "px";
    },
    hide: () => {
      container.style.display = "none";
    },
    update: (params) => {
      console.log("update", params);
      container.style.top = params.boundingBox.y + "px";
      container.style.left = params.boundingBox.x + "px";
    },
  };
};
