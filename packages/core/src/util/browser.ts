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

export function mergeCSSClasses(...classes: string[]) {
  return classes.filter((c) => c).join(" ");
}

export const isSafari = () =>
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
