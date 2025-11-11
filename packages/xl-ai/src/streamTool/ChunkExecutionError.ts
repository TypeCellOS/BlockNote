export class ChunkExecutionError extends Error {
  constructor(
    message: string,
    public readonly chunk: any,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ChunkExecutionError";
  }
}
