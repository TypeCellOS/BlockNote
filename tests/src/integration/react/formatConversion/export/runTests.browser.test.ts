import {
  testExportBlockNoteHTML,
  testExportHTML,
  testExportMarkdown,
} from "../../../shared/formatConversion/export/exportTestExecutors.js";
import {
  registerConversionCases,
  type ConversionExecutor,
} from "../registerConversionCases.js";
import {
  exportCases,
  markdownExportCases,
  type ReactExportCase,
} from "./exportTestInstances.js";

function normalizeSourcePreviewIds(html: string, firstSnapshotId: number) {
  // React allocates these client useIds across the retained module graph.
  // Map IDs and their references together, starting from the first ID
  // already recorded in this case's snapshot.
  const ids = new Map<string, string>();
  function normalizeId(id: string) {
    const existing = ids.get(id);
    if (existing !== undefined) {
      return existing;
    }
    const stable = `_r_${(firstSnapshotId + ids.size).toString(32)}_`;
    ids.set(id, stable);
    return stable;
  }
  return html.replace(
    /<!--[\s\S]*?-->|<[a-z][\w:-]*(?:\s+[\w:.-]+(?:="[^"]*")?)*\s*\/?>/gi,
    (tag) =>
      tag.startsWith("<!--")
        ? tag
        : tag.replace(
            /(\s+[\w:.-]+)="([^"]*)"/g,
            (attribute, name: string, value: string) =>
              name.trim() === "id" || name.trim() === "aria-describedby"
                ? `${name}="${value.replace(/(?<!\S)_r_[0-9a-v]+_(?!\S)/g, normalizeId)}"`
                : attribute,
          ),
  );
}

const sourcePreviewIds = new Map([
  ["mathBlock/basic", 0],
  ["math/basic", 1],
  ["diagram/basic", 2],
]);

function exportInternalHTML(
  editor: Parameters<ConversionExecutor>[0],
  testCase: ReactExportCase,
) {
  const firstSnapshotId = sourcePreviewIds.get(testCase.name);
  return testExportBlockNoteHTML(
    editor,
    testCase,
    firstSnapshotId === undefined
      ? undefined
      : (html) => normalizeSourcePreviewIds(html, firstSnapshotId),
  );
}

registerConversionCases(
  "React export tests (BlockNote HTML)",
  exportCases,
  exportInternalHTML,
  true,
);
registerConversionCases(
  "React export tests (HTML)",
  exportCases,
  testExportHTML,
  true,
);
registerConversionCases(
  "React export tests (Markdown)",
  markdownExportCases,
  testExportMarkdown,
);
