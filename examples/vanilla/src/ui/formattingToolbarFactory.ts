import { FormattingToolbarFactory } from "@blocknote/core";
import { createButton } from "./util";

/**
 * This menu is drawn when a piece of text is selected. We can use it to change formatting options
 * such as bold, italic, indentation, etc.
 */
export const formattingToolbarFactory: FormattingToolbarFactory = (
  staticParams
) => {
  const container = document.createElement("div");
  container.style.background = "gray";
  container.style.position = "absolute";
  container.style.padding = "10px";
  container.style.opacity = "0.8";
  const boldBtn = createButton("set bold", () => {
    staticParams.toggleBold();
  });
  container.appendChild(boldBtn);

  const linkBtn = createButton("set link", () => {
    staticParams.setHyperlink("https://www.google.com");
  });

  container.appendChild(boldBtn);
  container.appendChild(linkBtn);
  container.style.display = "none";
  document.body.appendChild(container);

  return {
    element: container,
    render: (params, isHidden) => {
      if (isHidden) {
        container.style.display = "block";
      }

      boldBtn.text = params.boldIsActive ? "unset bold" : "set bold";
      container.style.top = params.referenceRect.y + "px";
      container.style.left = params.referenceRect.x + "px";
    },
    hide: () => {
      container.style.display = "none";
    },
  };
};
