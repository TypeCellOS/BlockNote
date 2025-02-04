export declare class UnreachableCaseError extends Error {
    constructor(val: never);
}
export declare function assertEmpty(obj: Record<string, never>, throwError?: boolean): void;
export type NoInfer<T> = [T][T extends any ? 0 : never];
