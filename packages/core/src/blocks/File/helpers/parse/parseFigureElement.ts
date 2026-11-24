import { isEmptyMediaElement } from "./isEmptyMediaElement.js";

export const parseFigureElement = (
  figureElement: HTMLElement,
  targetTag: string,
) => {
  const targetElement = figureElement.querySelector(
    targetTag,
  ) as HTMLElement | null;
  if (!targetElement || isEmptyMediaElement(targetElement)) {
    return undefined;
  }

  const captionElement = figureElement.querySelector("figcaption");
  const caption = captionElement?.textContent ?? undefined;

  return { targetElement, caption };
};
