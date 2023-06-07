<template>
  <Sandbox
    template="react-ts"
    :options="getOptions()"
    :customSetup="getCustomSetup()"
    :theme="theme"
    :files="getFiles()"
  />
</template>

<script>
import { Sandpack } from "sandpack-vue3";

export default {
  components: {
    Sandbox: Sandpack,
  },
  props: ["content"],
  data() {
    return {
      theme: document.lastElementChild.className === "dark" ? "dark" : "light",
    };
  },
  mounted() {
    document
      .querySelector(`.appearance-action`)
      .addEventListener("click", () => {
        this.theme =
          document.lastElementChild.className === "dark" ? "dark" : "light";
      });
  },
  methods: {
    getOptions() {
      return {
        visibleFiles: [`/App.tsx`],
        showLineNumbers: true,
        editorWidthPercentage: 40,
      };
    },
    getCustomSetup() {
      return {
        dependencies: { "@blocknote/react": "latest" },
      };
    },
    getFiles() {
      return {
        "/styles.css": `body {
    font-family: sans-serif;
    -webkit-font-smoothing: auto;
    -moz-font-smoothing: auto;
    -moz-osx-font-smoothing: grayscale;
    font-smoothing: auto;
    text-rendering: optimizeLegibility;
    font-smooth: always;
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;

    background-color: ${this.theme === "dark" ? "#444" : "white"};
  }`,
        "/theme.tsx": `const theme: "light" | "dark" = "${this.theme}";
  export default theme;`,
        "/App.tsx": this.content,
      };
    },
  },
};
</script>
