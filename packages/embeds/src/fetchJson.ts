import type { ResolveResult } from "./types.js";

function transportFailure(error: unknown, signal: AbortSignal) {
  return (
    error instanceof TypeError ||
    (signal.aborted && error === signal.reason) ||
    (error instanceof DOMException &&
      (error.name === "AbortError" || error.name === "TimeoutError"))
  );
}

/** Private transport boundary only. Each caller still validates its own unknown wire data. */
export async function fetchJson(
  request: Request,
): Promise<ResolveResult<unknown>> {
  let response: Response;
  try {
    response = await fetch(request);
  } catch (error) {
    if (!transportFailure(error, request.signal)) {
      throw error;
    }
    return { status: "unavailable" };
  }
  if (!response.ok) {
    return { status: "unavailable" };
  }
  try {
    return { status: "success", value: await response.json() };
  } catch (error) {
    // SyntaxError is expected for JSON parsing, not an exception from fetch itself.
    if (
      !(error instanceof SyntaxError) &&
      !transportFailure(error, request.signal)
    ) {
      throw error;
    }
    return { status: "unavailable" };
  }
}
