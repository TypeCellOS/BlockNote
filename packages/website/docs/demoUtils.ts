import type { Ref } from "vue";

export const getTheme = (isDark: Ref<boolean>): "light" | "dark" =>
  isDark ? "dark" : "light";

export const getStyles = (isDark: Ref<boolean>): string => `body {
  font-family: sans-serif;
  -webkit-font-smoothing: auto;
  -moz-font-smoothing: auto;
  -moz-osx-font-smoothing: grayscale;
  font-smoothing: auto;
  text-rendering: optimizeLegibility;
  font-smooth: always;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  
  background-color: ${isDark ? "#151515" : "white"};
}`;
