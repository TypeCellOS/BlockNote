export class UnreachableCaseError extends Error {
  constructor(val: never) {
    super(`Unreachable case: ${val}`);
  }
}

// TODO: change for built-in version of typescript 5.4 after upgrade
export type NoInfer<T> = [T][T extends any ? 0 : never];
