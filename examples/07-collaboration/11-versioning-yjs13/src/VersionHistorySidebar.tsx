import { VersioningSidebar } from "@blocknote/react";
import { useState } from "react";

import { SettingsSelect } from "./SettingsSelect";

export const VersionHistorySidebar = () => {
  const [filter, setFilter] = useState<"named" | "all">("all");

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
              text: "Named",
              icon: null,
              onClick: () => setFilter("named"),
              isSelected: filter === "named",
            },
          ]}
        />
      </div>
      <VersioningSidebar filter={filter} />
    </div>
  );
};
