import { VersioningSidebar } from "@blocknote/react";

export const VersionHistorySidebar = () => {
  // YHub's activity timeline is the source of truth for versions, and YHub has
  // no concept of a custom/pinned name, so every version is shown ("all").
  return (
    <div className={"sidebar-section"}>
      <VersioningSidebar filter={"all"} />
    </div>
  );
};
