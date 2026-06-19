import { VersioningSidebar } from "@blocknote/react";

export function HistorySidebar() {
  return (
    <aside className="history-sidebar">
      <div className="history-header">
        <span className="history-title">History</span>
      </div>
      <div className="history-content">
        {/* YHub derives the version list from its activity timeline and has no
            concept of named snapshots, so there's no "Named" filter to offer. */}
        <VersioningSidebar />
      </div>
    </aside>
  );
}
