import DefaultTheme from "vitepress/theme";

// import "./scripts/edit-link";
import MySandbox from "./components/Sandbox/Sandbox.vue";
import "./styles/index.scss";

export default {
  ...DefaultTheme,
  enhanceApp(ctx: any) {
    DefaultTheme.enhanceApp(ctx);
    ctx.app.component("Sandbox", MySandbox);
  },
};
