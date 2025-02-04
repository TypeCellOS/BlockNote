import { StyleConfig } from "@blocknote/core";
import { FC } from "react";
export type ReactCustomStyleImplementation<T extends StyleConfig> = {
    render: T["propSchema"] extends "boolean" ? FC<{
        contentRef: (el: HTMLElement | null) => void;
    }> : FC<{
        contentRef: (el: HTMLElement | null) => void;
        value: string;
    }>;
};
export declare function createReactStyleSpec<T extends StyleConfig>(styleConfig: T, styleImplementation: ReactCustomStyleImplementation<T>): {
    config: T;
    implementation: import("@blocknote/core").StyleImplementation;
};
