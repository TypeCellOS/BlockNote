/** Shared root theming for React portals and core-created drag previews. */
export function applyBlockNoteRootTheme(
  element: HTMLElement,
  theme: {
    className: string;
    colorScheme: string | null;
    style?: CSSStyleDeclaration;
  },
) {
  element.className = theme.className;
  if (theme.colorScheme !== null) {
    element.setAttribute("data-color-scheme", theme.colorScheme);
  } else {
    element.removeAttribute("data-color-scheme");
  }
  if (theme.style) {
    // A root's layout belongs to the application, not its floating UI. Only
    // custom properties and color-scheme are part of the inline theme contract.
    for (const property of Array.from(theme.style)) {
      if (property.startsWith("--") || property === "color-scheme") {
        element.style.setProperty(
          property,
          theme.style.getPropertyValue(property),
          theme.style.getPropertyPriority(property),
        );
      }
    }
  }
}
