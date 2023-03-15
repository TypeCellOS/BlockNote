export const isAppleOS = () => {
  // FIXME: Code causing issues in SSR
  // /Mac/.test(navigator.platform) ||
  // (/AppleWebKit/.test(navigator.userAgent) &&
  //   /Mobile\/\w+/.test(navigator.userAgent));
  return false;
};

export function formatKeyboardShortcut(shortcut: string) {
  if (isAppleOS()) {
    return shortcut.replace("Mod", "⌘");
  } else {
    return shortcut.replace("Mod", "Ctrl");
  }
}
