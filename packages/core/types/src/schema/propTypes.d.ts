export type PropSpec<PType extends boolean | number | string> = {
    default: PType;
    values?: readonly PType[];
} | {
    default: undefined;
    type: "string" | "number" | "boolean";
    values?: readonly PType[];
};
export type PropSchema = Record<string, PropSpec<boolean | number | string>>;
export type Props<PSchema extends PropSchema> = {
    [PName in keyof PSchema]: (PSchema[PName] extends {
        default: boolean;
    } | {
        type: "boolean";
    } ? PSchema[PName]["values"] extends readonly boolean[] ? PSchema[PName]["values"][number] : boolean : PSchema[PName] extends {
        default: number;
    } | {
        type: "number";
    } ? PSchema[PName]["values"] extends readonly number[] ? PSchema[PName]["values"][number] : number : PSchema[PName] extends {
        default: string;
    } | {
        type: "string";
    } ? PSchema[PName]["values"] extends readonly string[] ? PSchema[PName]["values"][number] : string : never) extends infer T ? PSchema[PName] extends {
        optional: true;
    } ? T | undefined : T : never;
};
