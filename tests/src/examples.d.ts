// e2e tests mount example apps via `import App from "@examples/<group>/<name>/src/App"`.
// The `@examples` alias is resolved by Vite at runtime (see vite.config.browser.ts).
// We declare it ambiently as a React component so `tsc` resolves the import to a
// type WITHOUT descending into the example sources (which live outside the tests
// rootDir and would otherwise break the composite build with TS6059). A tsconfig
// `paths` entry would do the opposite — resolve to the real files — so we use this
// ambient module instead.
declare module "@examples/*" {
  import type { ComponentType } from "react";
  const App: ComponentType;
  export default App;
}
