import {
  commands as vitestCommands,
  page,
  server,
  userEvent,
} from "vite-plus/test/browser";

// `vite-plus/test/browser` re-exports `vitest/browser`, which Vitest replaces
// with a generated virtual module while running in Browser Mode. Import it from
// this single place so the e2e utils + tests share one `userEvent` instance
// (it preserves keyboard/pointer state across calls) and one command surface.
export { page, server, userEvent };

type BrowserCommands<Implementations> = {
  [Name in keyof Implementations]: Implementations[Name] extends (
    ...args: infer Args
  ) => infer Result
    ? Args extends [unknown, ...infer BrowserArgs]
      ? (...args: BrowserArgs) => Promise<Awaited<Result>>
      : never
    : never;
};

// Vite+ does not expose the augmentable BrowserCommands interface. Derive the
// browser signatures from the implementations, omitting their Node context.
const nodeCommands = vitestCommands as typeof vitestCommands &
  BrowserCommands<typeof import("./transport/index.js")>;

// Expose only shared operations here. Native reader transport stays private to
// setupScreenReader rather than leaking start/stop/transcript methods to tests.
export const commands = {
  pressKey: nodeCommands.pressKey,
  positionalMouse: nodeCommands.positionalMouse,
  imeComposition: nodeCommands.imeComposition,
  mockCustomBlockImages: nodeCommands.mockCustomBlockImages,
  mockVersioningMedia: nodeCommands.mockVersioningMedia,
  restoreTouchEmulation: nodeCommands.restoreTouchEmulation,
};
