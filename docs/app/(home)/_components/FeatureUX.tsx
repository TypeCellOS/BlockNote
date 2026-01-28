import React, { useState } from "react";
import { FeatureSection } from "./FeatureSection";
import { ContentItem, FeatureWindow } from "./ui/FeatureWindow";
export const FeatureUX: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"components" | "ai" | "blocks">(
    "components",
  );

  const content: Record<string, ContentItem> = {
    components: {
      type: "video",
      src: "/video/batteries-included.mp4",
    },
    ai: {
      type: "video",
      src: "/video/ai-select.mp4",
      className: "px-4",
    },
    blocks: {
      type: "video",
      src: "/video/dragdrop.mp4",
    },
  };

  const tabs = [
    {
      id: "components",
      icon: <span>🔋</span>,
      label: "Ready to Use",
      description:
        "Slash menus, formatting toolbars, and drag handles work instantly.",
    },
    {
      id: "ai",
      icon: <span>✨</span>,
      label: "AI Assistance",
      description: "Write and redact content with AI.",
    },
    {
      id: "blocks",
      icon: <span>🧱</span>,
      label: "Block-Based",
      description: "Drag, drop, and nest content blocks.",
    },
  ];

  return (
    <FeatureSection
      title="A modern editor, ready to ship."
      description="Built-in components provide a complete, block-based editing experience out of the box. Customize everything when you need to."
      tabs={tabs}
      activeTabId={activeTab}
      onTabChange={(id) => setActiveTab(id as any)}
      reverse={false}
    >
      <FeatureWindow content={content[activeTab]} theme="light" />
    </FeatureSection>
  );
};
