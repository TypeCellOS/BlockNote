export class ChunkExecutionError extends Error {
  public readonly aborted: boolean;

  constructor(
    message: string,
    public readonly chunk: any,
    options?: { cause?: unknown; aborted?: boolean },
  ) {
    super(message, options);
    this.name = "ChunkExecutionError";
    this.aborted = options?.aborted ?? false;
  }
}
