export class AbortError extends Error {
  constructor(
    message: string,
    options?: { cause?: unknown; aborted?: boolean },
  ) {
    super(message, options);
    this.name = "AbortError";
  }
}
