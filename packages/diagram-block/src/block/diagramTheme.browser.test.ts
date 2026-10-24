import { afterEach, describe, expect, test } from "vite-plus/test";

import "../../../react/src/editor/styles.css";
import "../../../shadcn/src/style.css";
import { renderDiagram } from "../helpers/renderDiagram.js";

// Real SVG/computed CSS is needed: node tests cannot observe inherited theme
// variables or a live color-scheme change. No editor machinery is involved.
const roots: HTMLElement[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    root.remove();
  }
});

async function diagram(
  className = "",
  source = "graph TD\n A[Start] --> B[End]",
) {
  const result = await renderDiagram(source);
  if (result.error !== undefined) {
    throw new Error(result.error);
  }
  const root = document.createElement("div");
  root.className = `bn-root ${className}`;
  root.dataset.colorScheme = "light";
  root.innerHTML = result.svg;
  roots.push(root);
  document.body.append(root);
  const svg = root.querySelector("svg")!;
  const label = svg.querySelector("text")!;
  const node = svg.querySelector(".pele-node rect")!;
  return { root, svg, label, node };
}

describe("diagram themes", () => {
  test("follows live light/dark changes without replacing the SVG", async () => {
    const { root, svg, label, node } = await diagram("bn-mantine");
    expect(getComputedStyle(label).fill).toBe("rgb(63, 63, 63)");
    expect(getComputedStyle(node).fill).toBe("rgb(239, 239, 239)");

    root.dataset.colorScheme = "dark";
    expect(getComputedStyle(label).fill).toBe("rgb(207, 207, 207)");
    expect(getComputedStyle(node).fill).toBe("rgb(22, 22, 22)");
    expect(root.querySelector("svg")).toBe(svg);
  });

  test("uses custom theme variables and keeps editors isolated", async () => {
    const first = await diagram("bn-mantine");
    const second = await diagram("bn-ak");
    // Mantine's custom theme objects set these variables on the themed root;
    // CSS themes can set the same variables without depending on Mantine.
    first.root.style.setProperty("--bn-colors-editor-text", "#123456");
    first.root.style.setProperty("--bn-colors-hovered-background", "#abcdef");
    first.root.style.setProperty("--bn-colors-border", "#345678");
    first.root.style.setProperty("--bn-border-radius", "12px");
    expect(getComputedStyle(first.label).fill).toBe("rgb(18, 52, 86)");
    expect(getComputedStyle(first.node).fill).toBe("rgb(171, 205, 239)");
    expect(getComputedStyle(first.node).stroke).toBe("rgb(52, 86, 120)");
    expect(
      getComputedStyle(first.svg).getPropertyValue("--pele-radius").trim(),
    ).toBe("12px");
    expect(getComputedStyle(second.label).fill).toBe("rgb(63, 63, 63)");
  });

  test("Shadcn uses its semantic tokens and updates with the host theme", async () => {
    const { root, label, node } = await diagram("bn-shadcn");
    root.style.setProperty("--foreground", "#112233");
    root.style.setProperty("--muted", "#ddeeff");
    root.style.setProperty("--border", "#445566");
    expect(getComputedStyle(label).fill).toBe("rgb(17, 34, 51)");
    expect(getComputedStyle(node).fill).toBe("rgb(221, 238, 255)");
    expect(getComputedStyle(node).stroke).toBe("rgb(68, 85, 102)");

    root.style.setProperty("--foreground", "#ddeeff");
    root.style.setProperty("--muted", "#112233");
    expect(getComputedStyle(label).fill).toBe("rgb(221, 238, 255)");
    expect(getComputedStyle(node).fill).toBe("rgb(17, 34, 51)");
  });

  test("chart colors follow BlockNote highlights and Shadcn chart tokens", async () => {
    const source = 'pie\n "One" : 3\n "Two" : 2';
    const first = await diagram("bn-mantine", source);
    const second = await diagram("bn-shadcn", source);
    first.root.style.setProperty("--bn-colors-highlights-blue-text", "#123456");
    second.root.style.setProperty("--chart-1", "#654321");
    expect(getComputedStyle(first.svg.querySelector(".pele-slice")!).fill).toBe(
      "rgb(18, 52, 86)",
    );
    expect(
      getComputedStyle(second.svg.querySelector(".pele-slice")!).fill,
    ).toBe("rgb(101, 67, 33)");
  });

  test("explicit Pele overrides still win and unconfigured Shadcn falls back", async () => {
    const { root, label, node } = await diagram("bn-shadcn");
    expect(getComputedStyle(label).fill).toBe("rgb(63, 63, 63)");
    root.style.setProperty("--pele-fg", "#654321");
    root.style.setProperty("--pele-surface", "#abcdef");
    expect(getComputedStyle(label).fill).toBe("rgb(101, 67, 33)");
    expect(getComputedStyle(node).fill).toBe("rgb(171, 205, 239)");
  });
});
