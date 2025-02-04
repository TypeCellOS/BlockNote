/**
 *
 * Helper functions so that we can import files both on vitest, browser and node
 * TODO: should find a way to test automatically in all environments
 */
/// <reference types="node" />
export declare function loadFileDataUrl(requireUrl: {
    default: string;
}, mimeType: string): Promise<string>;
export declare function loadFontDataUrl(requireUrl: {
    default: string;
}): Promise<string>;
export declare function loadFileBuffer(requireUrl: {
    default: string;
}): Promise<Buffer | ArrayBuffer>;
/**
 * usage:
 *
 *  await loadFontDataUrl(
      await import("../fonts/inter/Inter_18pt-Italic.ttf")
    );
 */
