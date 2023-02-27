export const isClientSide = () => typeof window !== "undefined";

export const isAppleOS = () =>
  isClientSide() &&
  (/Mac/.test(window.navigator.platform) ||
    (/AppleWebKit/.test(window.navigator.userAgent) &&
      /Mobile\/\w+/.test(window.navigator.userAgent)));

export function formatKeyboardShortcut(shortcut: string) {
  if (isAppleOS()) {
    return shortcut.replace("Mod", "⌘");
  } else {
    return shortcut.replace("Mod", "Ctrl");
  }
}
