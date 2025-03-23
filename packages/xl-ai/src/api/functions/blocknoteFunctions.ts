export type InsertBlocksOperation<T> = {
  type: "add"; // TODO: rename to insert?
  referenceId: string;
  position: "before" | "after";
  blocks: T[];
};

export type UpdateBlocksOperation<T> = {
  type: "update";
  id: string;
  block: T;
};

export type RemoveBlocksOperation = {
  type: "delete"; // TODO: rename to remove?
  ids: string[];
};

export type BlockNoteOperation<T> =
  | InsertBlocksOperation<T>
  | UpdateBlocksOperation<T>
  | RemoveBlocksOperation;

export type InvalidOrOk<T> =
  | {
      result: "invalid";
      reason: string;
    }
  | { result: "ok"; value: T };

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
*/
