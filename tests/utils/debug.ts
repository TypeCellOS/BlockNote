import { Page } from "@playwright/test";

export async function showMouseCursor(page: Page) {
  await page.evaluate(() => {
    if (window !== window.parent) return;

    let cursorStyle = {
      position: "absolute",
      left: "0",
      top: "0",
      width: "14px",
      height: "14px",
      "z-index": "1000",
      background: "rgba(0, 0, 0, 0.39)",
      border: "2px solid #fbfbfb9e",
      "border-radius": "14px",
      margin: "-8px 0 0 -8px",
      padding: "0",
      "pointer-events": "none",
    };

    let cssString = "";
    for (let [key, value] of Object.entries(cursorStyle)) {
      cssString += key + ":" + value + ";";
    }

    const cursor = document.createElement("div");
    cursor.setAttribute("style", cssString);
    document.body.appendChild(cursor);

    const updatePosition = (x: number, y: number) => {
      cursor.style.left = x + "px";
      cursor.style.top = y + "px";
    };
    const updateColor = (color: string) => {
      cursor.style.backgroundColor = color;
    };

    document.addEventListener(
      "mousemove",
      (event) => {
        updatePosition(event.pageX, event.pageY);
      },
      true
    );
    document.addEventListener(
      "mousedown",
      () => {
        updateColor("rgba(243, 169, 4, 0.87)");
      },
      true
    );
    document.addEventListener(
      "mouseup",
      () => {
        updateColor("rgba(0, 0, 0, 0.39)");
      },
      true
    );
    document.addEventListener(
      "drag",
      (event) => {
        updatePosition(event.pageX, event.pageY);
      },
      true
    );
    document.addEventListener(
      "dragstart",
      () => {
        updateColor("rgba(243, 169, 4, 0.87)");
      },
      true
    );
    document.addEventListener(
      "dragend",
      () => {
        updateColor("rgba(0, 0, 0, 0.39)");
      },
      true
    );
  }, false);
}
