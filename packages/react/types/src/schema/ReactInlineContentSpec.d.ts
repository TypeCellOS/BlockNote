import { CustomInlineContentConfig, InlineContentFromConfig, PartialCustomInlineContentFromConfig, Props, PropSchema, StyleSchema } from "@blocknote/core";
import { FC } from "react";
export type ReactInlineContentImplementation<T extends CustomInlineContentConfig, S extends StyleSchema> = {
    render: FC<{
        inlineContent: InlineContentFromConfig<T, S>;
        updateInlineContent: (update: PartialCustomInlineContentFromConfig<T, S>) => void;
        contentRef: (node: HTMLElement | null) => void;
    }>;
};
export declare function InlineContentWrapper<IType extends string, PSchema extends PropSchema>(props: {
    children: JSX.Element;
    inlineContentType: IType;
    inlineContentProps: Props<PSchema>;
    propSchema: PSchema;
}): import("react/jsx-runtime").JSX.Element;
export declare function createReactInlineContentSpec<T extends CustomInlineContentConfig, S extends StyleSchema>(inlineContentConfig: T, inlineContentImplementation: ReactInlineContentImplementation<T, S>): {
    config: T;
    implementation: import("@blocknote/core").InlineContentImplementation<T>;
};
