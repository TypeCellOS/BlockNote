import { ThreadsSidebar } from "@blocknote/react";
import { useState } from "react";

import { SettingsSelect } from "./SettingsSelect";

export const CommentsSidebar = () => {
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [sort, setSort] = useState<"position" | "recent-activity" | "oldest">(
    "position",
  );

  return (
    <div className={"sidebar-section"}>
      <div className={"settings"}>
        <SettingsSelect
          label={"Filter"}
          items={[
            {
              text: "All",
              icon: null,
              onClick: () => setFilter("all"),
              isSelected: filter === "all",
            },
            {
              text: "Open",
              icon: null,
              onClick: () => setFilter("open"),
              isSelected: filter === "open",
            },
            {
              text: "Resolved",
              icon: null,
              onClick: () => setFilter("resolved"),
              isSelected: filter === "resolved",
            },
          ]}
        />
        <SettingsSelect
          label={"Sort"}
          items={[
            {
              text: "Position",
              icon: null,
              onClick: () => setSort("position"),
              isSelected: sort === "position",
            },
            {
              text: "Recent activity",
              icon: null,
              onClick: () => setSort("recent-activity"),
              isSelected: sort === "recent-activity",
            },
            {
              text: "Oldest",
              icon: null,
              onClick: () => setSort("oldest"),
              isSelected: sort === "oldest",
            },
          ]}
        />
      </div>
      <ThreadsSidebar filter={filter} sort={sort} />
    </div>
  );
};
