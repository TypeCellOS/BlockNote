export type SimpleJSONObjectSchema = {
  type: "object";
  properties: {
    [key: string]: any;
  };
  required?: string[];
  additionalProperties?: boolean;
};
