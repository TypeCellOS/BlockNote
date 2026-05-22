// e2e tests mount example apps via `import App from "@examples/<group>/<name>/src/App"`.
// The `@examples` alias is resolved by Vite at runtime (see vite.config.browser.ts).
// We declare it ambiently as a React component so `tsc` doesn't try to descend
// into (and type-check) the example sources and their unrelated dependencies.
declare module "@examples/*" {
  import type { ComponentType } from "react";
  const App: ComponentType;
  export default App;
}
