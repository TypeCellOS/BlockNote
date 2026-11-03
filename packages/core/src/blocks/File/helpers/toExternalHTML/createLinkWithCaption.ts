/**
 * A link to the file of a block, as a block of external HTML: in a `div`, with
 * the caption in a paragraph after it, or (without a caption) in a
 * paragraph. A link alone is inline content: the HTML parser joins two
 * adjacent links into one paragraph.
 */
export const createLinkWithCaption = (
  element: HTMLElement,
  caption: string,
) => {
  if (!caption) {
    const paragraph = document.createElement("p");
    paragraph.appendChild(element);
    return { dom: paragraph };
  }
  const wrapper = document.createElement("div");
  const fileCaption = document.createElement("p");
  fileCaption.textContent = caption;

  wrapper.appendChild(element);
  wrapper.appendChild(fileCaption);

  return {
    dom: wrapper,
  };
};
