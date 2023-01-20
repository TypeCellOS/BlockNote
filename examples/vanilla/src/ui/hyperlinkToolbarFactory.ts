import { HyperlinkToolbarFactory } from "@blocknote/core";
import { createButton } from "./util";

/**
 * This menu is drawn when the cursor is moved to a hyperlink (using the keyboard),
 * or when the mouse is hovering over a hyperlink
 */
export const hyperlinkToolbarFactory: HyperlinkToolbarFactory = (
  staticParams
) => {
  const container = document.createElement("div");
  container.style.background = "gray";
  container.style.position = "absolute";
  container.style.padding = "10px";
  container.style.opacity = "0.8";

  let url = "";
  let text = "";

  const editBtn = createButton("edit", () => {
    const newUrl = prompt("new url") || url;
    staticParams.editHyperlink(newUrl, text);
  });

  container.appendChild(editBtn);

  const removeBtn = createButton("remove", () => {
    staticParams.deleteHyperlink();
  });

  container.appendChild(editBtn);
  container.appendChild(removeBtn);
  container.style.display = "none";
  document.body.appendChild(container);

  return {
    element: container,
    render: (params, isHidden) => {
      if (isHidden) {
        url = params.url;
        text = params.text;

        container.style.display = "block";
      }

      console.log("show", params);
      container.style.top = params.referenceRect.y + "px";
      container.style.left = params.referenceRect.x + "px";
    },
    hide: () => {
      container.style.display = "none";
    },
  };
};
