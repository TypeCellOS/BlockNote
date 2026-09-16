import { VersioningSidebar } from "@blocknote/react/versioning";

export const VersionHistorySidebar = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className={"sidebar-section"}>
      {/* Filtering to named versions is built in — the sidebar's own header
          toggle drives it. The header's close button calls `onClose`. */}
      <VersioningSidebar onClose={onClose} />
    </div>
  );
};
