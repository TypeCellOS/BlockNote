/// <reference types="react" />
/**
 * A helper component to render a single element to a container so we can subsequently read the DOM / HTML contents
 *
 * This is useful so we can render arbitrary React elements (blocks) in the correct context (used by `ReactRenderUtil`)
 */
export declare const ElementRenderer: import("react").ForwardRefExoticComponent<import("react").RefAttributes<(node: React.ReactNode, container: HTMLElement) => void>>;
