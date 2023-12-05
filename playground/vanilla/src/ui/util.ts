export function createButton(text: string, onClick: () => void) {
  const element = document.createElement("a");
  element.href = "#";
  element.text = text;
  element.style.margin = "10px";
  element.addEventListener("click", (e) => {
    onClick();
    e.preventDefault();
  });
  return element;
}
