export class UnreachableCaseError extends Error {
    constructor(val: never) {
        super(`Unreachable case: ${val}`);
    }
}

/**
 * https://stackoverflow.com/questions/56687668/a-way-to-disable-type-argument-inference-in-generics
 * 
 * https://github.com/microsoft/TypeScript/pull/56794
 * 
 * TODO: maybe remove this type after typescript 5.4 is released
 */
export type NoInfer<T> = [T][T extends any ? 0 : never];

export type Equal<Left, Right> =
  (<U>() => U extends Left ? 1 : 0) extends (<U>() => U extends Right ? 1 : 0) ? true : false
