import { DeepPartial } from "ai";
import { Result } from "../../../../streamTool/streamTool.js";

export function validateBlockArray<U>(
  inputArray: DeepPartial<Array<U>>,
  validateItem: (item: DeepPartial<U>) => Result<U>,
): Result<U[]> {
  if (!inputArray || !Array.isArray(inputArray) || inputArray.length === 0) {
    return {
      ok: false,
      error: "blocks is required",
    };
  }

  const validatedBlocks: U[] = [];

  for (const item of inputArray) {
    const validationResult = validateItem(item as DeepPartial<U>);
    if (!validationResult.ok) {
      return {
        ok: false,
        error: `Invalid block: ${validationResult.error}`,
      };
    }
    validatedBlocks.push(validationResult.value);
  }

  return {
    ok: true,
    value: validatedBlocks,
  };
}
