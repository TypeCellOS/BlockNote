export type CombinedColor = Partial<{
    text: string;
    background: string;
}>;
export type ColorScheme = Partial<{
    editor: CombinedColor;
    menu: CombinedColor;
    tooltip: CombinedColor;
    hovered: CombinedColor;
    selected: CombinedColor;
    disabled: CombinedColor;
    shadow: string;
    border: string;
    sideMenu: string;
    highlights: Partial<{
        gray: CombinedColor;
        brown: CombinedColor;
        red: CombinedColor;
        orange: CombinedColor;
        yellow: CombinedColor;
        green: CombinedColor;
        blue: CombinedColor;
        purple: CombinedColor;
        pink: CombinedColor;
    }>;
}>;
export type Theme = Partial<{
    colors: ColorScheme;
    borderRadius: number;
    fontFamily: string;
}>;
export declare const applyBlockNoteCSSVariablesFromTheme: (theme: Theme, editorDOM: HTMLElement) => string[];
export declare const removeBlockNoteCSSVariables: (editorDOM: HTMLElement) => string[];
