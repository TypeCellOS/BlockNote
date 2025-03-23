import { DeepPartial } from "ai";
import { InvalidOrOk } from "../blocknoteFunctions.js";

export function validateArray<U>(
  inputArray: DeepPartial<Array<U>>,
  validateItem: (item: DeepPartial<U>) => InvalidOrOk<U>
): InvalidOrOk<U[]> {
  if (!inputArray || !Array.isArray(inputArray) || inputArray.length === 0) {
    return {
      result: "invalid",
      reason: "blocks is required",
    };
  }

  const validatedBlocks: U[] = [];

  for (const item of inputArray) {
    const validationResult = validateItem(item as DeepPartial<U>);
    if (validationResult.result === "invalid") {
      return {
        result: "invalid",
        reason: `Invalid block: ${validationResult.reason}`,
      };
    }
    validatedBlocks.push(validationResult.value);
  }

  return {
    result: "ok",
    value: validatedBlocks,
  };
}
