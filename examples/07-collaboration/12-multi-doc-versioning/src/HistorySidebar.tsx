import { VersioningSidebar } from "@blocknote/react";

export function HistorySidebar({ onClose }: { onClose: () => void }) {
  return (
    <aside className="history-sidebar">
      <div className="history-content">
        {/* YHub derives the version list from its activity timeline and has no
            concept of named snapshots, so there's no "Named" filter to offer.
            VersioningSidebar renders its own "History" header (with the close
            button when `onClose` is passed), so no extra title is needed here. */}
        <VersioningSidebar filter="all" onClose={onClose} />
      </div>
    </aside>
  );
}
