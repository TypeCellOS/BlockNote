export const AI_OPERATION_DELETE = {
  name: "delete",
  description: "Delete a block",
  parameters: {
    id: {
      type: "string",
      description: "id of block to delete",
    },
  },
  required: ["id"],
};

export function operationToJSONSchema(operation: any) {
  // const parameterProperties = Object.entries(operation.parameters).map(
  //   ([key, value]) => {
  //     const { required, ...rest } = value;
  //     return {
  //       [key]: rest,
  //     };
  //   }
  // );
  return {
    type: "object",
    description: operation.description,
    properties: {
      type: {
        type: "string",
        enum: [operation.name],
      },
      ...operation.parameters,

      // ...Object.entries(operation.parameters).map(([key, value]) => {
      // return {
      // [key]: value,
      // };
      // }),
    },
    required: ["type", ...operation.required],
    additionalProperties: false,
  } as const;
}

export const AI_OPERATION_INSERT = {
  description: "Insert new blocks",
  parameters: {
    referenceId: {
      type: "string",
      description: "",
      required: true,
    },
    position: {
      type: "string",
      enum: ["before", "after"],
      description:
        "Whether new block(s) should be inserterd before or after `referenceId`",
      required: true,
    },
    blocks: {
      items: {
        // $ref: "#/definitions/newblock",
        type: "object",
        properties: {},
      },
      type: "array",
      required: true,
    },
  },
};

export const AI_OPERATION_UPDATE = {
  name: "update",
  description: "Update a block",
  parameters: {
    id: {
      type: "string",
      description: "id of block to update",
    },
    block: {
      // $ref: "#/definitions/newblock",
      type: "object",
      properties: {},
    },
  },
  required: ["id", "block"],
};

// UPDATE_MARKDOWN
// INSERT_MARKDOWN

export function createOperationsArraySchema(operations: any[]) {
  return {
    type: "object",
    properties: {
      operations: {
        type: "array",
        items: {
          anyOf: operations.map((op) => operationToJSONSchema(op)),
        },
      },
    },
    additionalProperties: false,
    required: ["operations"],
  } as const;
}
