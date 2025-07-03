export const isAppleOS = () =>
  typeof navigator !== "undefined" &&
  (/Mac/.test(navigator.platform) ||
    (/AppleWebKit/.test(navigator.userAgent) &&
      /Mobile\/\w+/.test(navigator.userAgent)));

export function formatKeyboardShortcut(shortcut: string, ctrlText = "Ctrl") {
  if (isAppleOS()) {
    return shortcut.replace("Mod", "⌘");
  } else {
    return shortcut.replace("Mod", ctrlText);
  }
}

export function mergeCSSClasses(...classes: (string | false | undefined)[]) {
  return [
    // Converts to & from set to remove duplicates.
    ...new Set(
      classes
        .filter((c) => c)
        // Ensures that if multiple classes are passed as a single string, they
        // are split.
        .join(" ")
        .split(" "),
    ),
  ].join(" ");
}

export const isSafari = () =>
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
