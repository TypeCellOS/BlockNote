/**
 * The font diagrams render in when nothing more specific is known -
 * BlockNote's default UI font, so diagrams match the surrounding document
 * out of the box. Consumers with a themed font get it applied where the
 * actual font is discoverable (the editor preview reads the editor's
 * computed style; exporters pass their document font).
 */
export const DEFAULT_DIAGRAM_FONT_FAMILY = '"Inter", sans-serif';
