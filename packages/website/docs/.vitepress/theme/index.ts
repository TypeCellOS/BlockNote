import DefaultTheme from "vitepress/theme";

// import "./scripts/edit-link";
import ThemedSandbox from "./components/Sandbox/ThemedSandbox.vue";
import "./styles/index.scss";

export default {
  ...DefaultTheme,
  enhanceApp(ctx: any) {
    DefaultTheme.enhanceApp(ctx);
    ctx.app.component("Sandbox", ThemedSandbox);
  },
};
