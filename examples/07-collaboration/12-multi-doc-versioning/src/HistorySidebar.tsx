import { VersioningSidebar } from "@blocknote/react";
import { useState } from "react";

export function HistorySidebar() {
  const [filter, setFilter] = useState<"named" | "all">("all");

  return (
    <aside className="history-sidebar">
      <div className="history-header">
        <span className="history-title">History</span>
        <div className="history-filter">
          <button
            className={
              "history-filter-btn" + (filter === "all" ? " active" : "")
            }
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={
              "history-filter-btn" + (filter === "named" ? " active" : "")
            }
            onClick={() => setFilter("named")}
          >
            Named
          </button>
        </div>
      </div>
      <div className="history-content">
        <VersioningSidebar filter={filter} />
      </div>
    </aside>
  );
}
