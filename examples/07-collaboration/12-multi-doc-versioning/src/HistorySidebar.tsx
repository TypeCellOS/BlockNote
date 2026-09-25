import { VersioningSidebar } from "@blocknote/react/versioning";

export function HistorySidebar({ onClose }: { onClose: () => void }) {
  return (
    <aside className="history-sidebar">
      <div className="history-content">
        {/* VersioningSidebar renders its own "History" header (with the close
            button when `onClose` is passed), so no extra title is needed here. */}
        <VersioningSidebar onClose={onClose} />
      </div>
    </aside>
  );
}
