/**
 * Puts the link to the file of a block into a block-level element. With a
 * caption, this is a `div` with the link and the caption in a paragraph.
 * Without a caption, this is a paragraph. A link alone is inline content: the
 * HTML parse joins two adjacent links into one paragraph.
 */
export const createLinkWithCaption = (
  element: HTMLElement,
  caption: string,
) => {
  if (!caption) {
    const paragraph = document.createElement("p");
    paragraph.appendChild(element);

    return {
      dom: paragraph,
    };
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
