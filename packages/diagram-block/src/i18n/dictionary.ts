import { BlockNoteEditor, Exporter } from "@blocknote/core";

import { en } from "./locales/en.js";

export type DiagramDictionary = typeof en;

/**
 * Returns the Diagram dictionary for the editor. The Diagram block is localized
 * by merging a `diagram` dictionary into the editor's dictionary (see the
 * exported `locales`); when the host hasn't provided one, the bundled English
 * strings are used, so the block works without extra setup.
 */
export function getDiagramDictionary(
  editor: BlockNoteEditor<any, any, any>,
): DiagramDictionary {
  return (
    ((editor.dictionary as any).diagram as DiagramDictionary | undefined) ?? en
  );
}

/**
 * Returns the Diagram exporter strings. Exporters are localized independently
 * of an editor: the host passes a dictionary to the exporter's options
 * (see `ExporterOptions.dictionary`), and the diagram strings are read from
 * its `diagram` section - the same shape merged into editor dictionaries -
 * falling back to the bundled English strings.
 */
export function getDiagramExporterDictionary(
  exporter: Exporter<any, any, any, any, any, any, any>,
): DiagramDictionary["exporter"] {
  return (
    (
      (exporter.options.dictionary as any)?.diagram as
        | DiagramDictionary
        | undefined
    )?.exporter ?? en.exporter
  );
}
