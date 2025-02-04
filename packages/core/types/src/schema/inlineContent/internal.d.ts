import { KeyboardShortcutCommand, Node } from "@tiptap/core";
import { PropSchema, Props } from "../propTypes.js";
import { CustomInlineContentConfig, InlineContentConfig, InlineContentImplementation, InlineContentSchemaFromSpecs, InlineContentSpecs } from "./types.js";
export declare function addInlineContentAttributes<IType extends string, PSchema extends PropSchema>(element: {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
}, inlineContentType: IType, inlineContentProps: Props<PSchema>, propSchema: PSchema): {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
};
export declare function addInlineContentKeyboardShortcuts<T extends CustomInlineContentConfig>(config: T): {
    [p: string]: KeyboardShortcutCommand;
};
export declare function createInternalInlineContentSpec<T extends InlineContentConfig>(config: T, implementation: InlineContentImplementation<T>): {
    config: T;
    implementation: InlineContentImplementation<T>;
};
export declare function createInlineContentSpecFromTipTapNode<T extends Node, P extends PropSchema>(node: T, propSchema: P): {
    config: {
        type: T["name"];
        propSchema: P;
        content: "styled" | "none";
    };
    implementation: {
        node: Node<any, any>;
    };
};
export declare function getInlineContentSchemaFromSpecs<T extends InlineContentSpecs>(specs: T): InlineContentSchemaFromSpecs<T>;
