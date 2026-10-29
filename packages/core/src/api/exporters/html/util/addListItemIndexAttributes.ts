// Mirrors getListItemIndexDecorations when exporting internal HTML, where
// editor plugins do not run.
export function addListItemIndexAttributes(element: HTMLElement) {
  const numberedListItems = element.querySelectorAll(
    '[data-content-type="numberedListItem"]',
  );
  numberedListItems.forEach((numberedListItem) => {
    const prevNumberedListItem = numberedListItem
      .closest(".bn-block-outer")
      ?.previousElementSibling?.querySelector(
        '[data-content-type="numberedListItem"]',
      );

    if (!prevNumberedListItem) {
      numberedListItem.setAttribute(
        "data-index",
        numberedListItem.getAttribute("data-start") || "1",
      );
    } else {
      const prevNumberedListItemIndex =
        prevNumberedListItem.getAttribute("data-index");
      numberedListItem.setAttribute(
        "data-index",
        (parseInt(prevNumberedListItemIndex || "0") + 1).toString(),
      );
    }
  });

  return element;
}
