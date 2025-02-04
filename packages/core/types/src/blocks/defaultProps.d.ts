import type { Props } from "../schema/index.js";
export declare const defaultProps: {
    backgroundColor: {
        default: "default";
    };
    textColor: {
        default: "default";
    };
    textAlignment: {
        default: "left";
        values: readonly ["left", "center", "right", "justify"];
    };
};
export type DefaultProps = Props<typeof defaultProps>;
export declare const inheritedProps: string[];
