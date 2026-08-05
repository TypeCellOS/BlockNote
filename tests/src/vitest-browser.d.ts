// This vite-plus build's `@vitest/browser/context` runtime exports
// `createUserEvent` (a factory), but its shipped `.d.ts` only declares the
// default `userEvent`. Augment the module type to match the runtime so
// `src/utils/context.ts` type-checks.
import type { UserEvent } from "vite-plus/test/browser/context";

declare module "vite-plus/test/browser/context" {
  export function createUserEvent(): UserEvent;
}
