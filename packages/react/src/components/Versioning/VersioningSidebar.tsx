import { VersioningExtension } from "@blocknote/core/extensions";

import { useExtensionState } from "../../hooks/useExtension.js";
import { CurrentSnapshot } from "./CurrentSnapshot.js";
import { Snapshot } from "./Snapshot.js";

export const VersioningSidebar = () => {
  const { snapshots } = useExtensionState(VersioningExtension);

  return (
    <div className="bn-versioning-sidebar">
      <CurrentSnapshot />
      {snapshots.map((snapshot, index) => {
        return <Snapshot key={index} snapshot={snapshot} />;
      })}
    </div>
  );
};
