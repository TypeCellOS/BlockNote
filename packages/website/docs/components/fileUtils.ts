export function generateStyles(isDark: boolean, extraStyles?: string) {
  return `body {
  font-family: sans-serif;
  -webkit-font-smoothing: auto;
  -moz-font-smoothing: auto;
  -moz-osx-font-smoothing: grayscale;
  font-smoothing: auto;
  text-rendering: optimizeLegibility;
  font-smooth: always;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  
  background-color: ${isDark ? "#202020" : "white"};
}
${extraStyles !== undefined ? "\n" + extraStyles + "\n" : ""}`;
}
