export const createLinkWithCaption = (
  element: HTMLElement,
  caption: string,
) => {
  const wrapper = document.createElement("div");
  const fileCaption = document.createElement("p");
  fileCaption.textContent = caption;

  wrapper.appendChild(element);
  wrapper.appendChild(fileCaption);

  return {
    dom: wrapper,
  };
};
