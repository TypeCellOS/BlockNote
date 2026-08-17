import { BlockNoteEditor, Exporter } from "@blocknote/core";

import { en } from "./locales/en.js";

export type MathDictionary = typeof en;

/**
 * Returns the Math dictionary for the editor. The Math block/inline content are
 * localized by merging a `math` dictionary into the editor's dictionary (see
 * the exported `locales`); when the host hasn't provided one, the bundled
 * English strings are used, so the blocks work without extra setup.
 */
export function getMathDictionary(
  editor: BlockNoteEditor<any, any, any>,
): MathDictionary {
  return ((editor.dictionary as any).math as MathDictionary | undefined) ?? en;
}

/**
 * Returns the Math exporter strings. Exporters are localized independently
 * of an editor: the host passes a dictionary to the exporter's options
 * (see `ExporterOptions.dictionary`), and the math strings are read from
 * its `math` section - the same shape merged into editor dictionaries -
 * falling back to the bundled English strings.
 */
export function getMathExporterDictionary(
  exporter: Exporter<any, any, any, any, any, any, any>,
): MathDictionary["exporter"] {
  return (
    ((exporter.options.dictionary as any)?.math as MathDictionary | undefined)
      ?.exporter ?? en.exporter
  );
}
