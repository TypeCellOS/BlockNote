import { BlockNoteEditor } from "@blocknote/core";
import { DeepPartial } from "ai";
import { JSONSchema7 } from "json-schema";

export type InvalidOrOk<T> =
  | {
      result: "invalid";
      reason: string;
    }
  | { result: "ok"; value: T };

/**
 * A StreamTool is a function that can be called by the LLM.
 * It's similar to a Tool in the Vercel AI SDK, but:
 *
 * - a collection of StreamTools can be wrapped in a single LLM Tool to issue multiple operations (tool calls) at once.
 * - StreamTools can be used in a streaming manner.
 */
export type StreamTool<T extends { type: string }> = {
  /**
   * The name of the tool
   */
  name: T["type"];
  /**
   * An optional description of the tool that can influence when the tool is picked.
   */
  description?: string;
  /**
   * The schema of the input that the tool expects. The language model will use this to generate the input.
   */
  parameters: JSONSchema7;
  /**
   * Validates the input of the tool call
   *
   * @param operation - The operation to validate.
   * This can be a partial object as the LLM may not have completed the operation yet.
   * The object is not guaranteed to be of type DeepPartial<T> as the LLM might not conform to the schema correctly - so this needs to be validated.
   */
  validate: (
    operation: DeepPartial<T>, // TODO: maybe `unknown` is better?
    editor: BlockNoteEditor<any, any, any>,
    options: {
      idsSuffixed: boolean;
    }
  ) => InvalidOrOk<T>;
};

export type StreamToolCallSingle<T extends StreamTool<any>> =
  T extends StreamTool<infer U> ? U : never;

/**
 * A ToolCall represents an invocation of a StreamTool.
 *
 * Its type is the same as what a validated StreamTool returns
 */
export type StreamToolCall<T extends StreamTool<any> | StreamTool<any>[]> =
  T extends StreamTool<infer U>
    ? U
    : // when passed an array of StreamTools, StreamToolCall represents the type of one of the StreamTool invocations
    T extends StreamTool<any>[]
    ? T[number] extends StreamTool<infer V>
      ? V
      : never
    : never;

/**
 * Create a StreamTool.
 *
 * A StreamTool is a function that can be called by the LLM.
 * It's similar to a Tool in the Vercel AI SDK, but:
 *
 * - a collection of StreamTools can be wrapped in a single LLM Tool to issue multiple operations (tool calls) at once.
 * - StreamTools can be used in a streaming manner.
 */
export function streamTool<T extends { type: string }>(
  name: T["type"],
  description: string,
  schema: JSONSchema7,
  validate: (
    operation: DeepPartial<T>,
    editor: BlockNoteEditor<any, any, any>,
    options: { idsSuffixed: boolean }
  ) => InvalidOrOk<T>
): StreamTool<T> {
  return {
    name,
    description,
    parameters: schema,
    validate,
  };
}

/*

testing the validators / invalidorok

export type Car = {
  type: "car";
  brand: string;
};

export type Bike = {
  type: "bike";
  color: string;
};

const objects: any[] = [
  {
    x: 4,
  },
  { type: "car", brand: "Ford", model: "Mustang" },
  { type: "bike", color: "red" },
];

const validateCar = (obj: any): InvalidOrOk<Car> => {
  if (obj.type !== "car") {
    throw new Error("wrong validator called");
  }

  if (typeof obj.brand !== "string") {
    return {
      result: "invalid",
      reason: "no brand",
    };
  }

  return {
    result: "ok",
    value: obj,
  };
};

const validateBike = (obj: any): InvalidOrOk<Bike> => {
  if (obj.type !== "bike") {
    throw new Error("wrong validator called");
  }

  if (typeof obj.color !== "string") {
    return {
      result: "invalid",
      reason: "no color",
    };
  }

  return {
    result: "ok",
    value: obj,
  };
};

type ValidatorFor<T> = {
  type: string;
  validate: (obj: any) => InvalidOrOk<T>;
};

// Refined validator to work with discriminated unions
type TypedValidator<T extends { type: string }> = {
  type: T["type"];
  validate: (obj: any) => InvalidOrOk<T>;
};

// The code below should be generic and not use Car and Bike
const validate = <T extends { type: string }>(
  obj: any,
  validators: readonly TypedValidator<T>[]
) => {
  const validator = validators.find((v) => v.type === obj.type);
  if (!validator) {
    return {
      result: "invalid",
      reason: "Invalid object type",
    } as InvalidOrOk<T>;
  }
  return validator.validate(obj);
};

// Simplified version
const validateAll = <T extends { type: string }>(
  objects: any[],
  validators: readonly TypedValidator<T>[]
) => {
  return objects.map((obj) => validate<T>(obj, validators));
};

// Define vehicle validators with proper types
const carValidator: TypedValidator<Car> = {
  type: "car",
  validate: validateCar,
};

const bikeValidator: TypedValidator<Bike> = {
  type: "bike",
  validate: validateBike,
};

// Create a union type for readability, but not strictly necessary
type Vehicle = Car | Bike;

// Type helper to extract the validated types
type ExtractValidatedTypes<T> = T extends TypedValidator<infer U> ? U : never;

// Helper function that infers the union type automatically
function createValidatorsForTypes<T extends readonly TypedValidator<any>[]>(
  ...validators: T
): readonly TypedValidator<ExtractValidatedTypes<T[number]>>[] {
  return validators;
}

const validators = [carValidator, bikeValidator];

type S = TypedValidator<ExtractValidatedTypes<(typeof validators)[number]>>;

// Use the helper function - no type parameter needed!
const vehicleValidators = createValidatorsForTypes(carValidator, bikeValidator);

// example usage
const validated = validateAll(objects, vehicleValidators);
const o = validated[0];
if (o.result === "ok") {
  const val = o.value; // val is now of type Vehicle (Car | Bike)
}


export type Car = {
  type: "car";
  brand: string;
};

export type RepairedCar = {
  type: "car";
  brand: string;
  repaired: true;
};

export type Bike = {
  type: "bike";
  color: string;
};

export type Vehicle = { type: string };

export function processVehicles(vehicles: Vehicle[]) {
  return vehicles.map((v) => {
    if (v.type === "car") {
      return v;
    }
  });
}

export const vehicles: Array<Car | Bike> = [
  { type: "car", brand: "Ford" },
  { type: "bike", color: "red" },
];

// Type guard to check if a vehicle is a Car
function isCar(vehicle: Vehicle): vehicle is Car {
  return vehicle.type === "car" && "brand" in vehicle;
}

// This function should return an array of vehicles with cars repaired
const carRepairer = function <T extends Vehicle[]>(vehicles: T) {
  const ret: Array<Vehicle | RepairedCar> = [];

  for (const v of vehicles) {
    if (v.type === "car") {
      // Use type assertion to tell TypeScript this is a Car
      const car = v as unknown as Car;
      ret.push({ ...car, repaired: true });
    } else {
      ret.push(v);
    }
  }
  return ret;
};

// Alternative implementation using type guard
const carRepairerWithGuard = function <T extends Vehicle[]>(vehicles: T) {
  const ret: Array<Vehicle | RepairedCar> = [];

  for (const v of vehicles) {
    if (isCar(v)) {
      ret.push({ ...v, repaired: true });
    } else {
      ret.push(v);
    }
  }
  return ret;
};

// Advanced version with better type preservation
type ReplaceCarWithRepairedCar<T> = T extends Car ? RepairedCar : T;

const carRepairerAdvanced = function <T extends Vehicle[]>(
  vehicles: T
): { [K in keyof T]: ReplaceCarWithRepairedCar<T[K]> } {
  const ret: Array<ReplaceCarWithRepairedCar<T[number]>> = [];
  return vehicles.map((v) => {
    if (isCar(v)) {
      return { ...v, repaired: true } as ReplaceCarWithRepairedCar<typeof v>;
    }
    return v as ReplaceCarWithRepairedCar<typeof v>;
  }) as { [K in keyof T]: ReplaceCarWithRepairedCar<T[K]> };
};

// Example usage:
const repairedVehicles = carRepairerAdvanced(vehicles);
*/
