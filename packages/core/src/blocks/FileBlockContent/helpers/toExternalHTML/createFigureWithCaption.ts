export const createFigureWithCaption = (
  element: HTMLElement,
  caption: string,
) => {
  const figure = document.createElement("figure");
  const captionElement = document.createElement("figcaption");
  captionElement.textContent = caption;

  figure.appendChild(element);
  figure.appendChild(captionElement);

  return { dom: figure };
};
