import React, { useState } from "react";
import { FeatureSection } from "./FeatureSection";
import { ContentItem, FeatureWindow } from "./ui/FeatureWindow";

export const FeatureCollab: React.FC<{
  code: { realtime: string };
}> = ({ code }) => {
  const [activeTab, setActiveTab] = useState<
    "realtime" | "comments" | "suggestions"
  >("realtime");

  const content: Record<string, ContentItem> = {
    realtime: {
      type: "code",
      file: "CollaborativeEditor.tsx",
      code: code.realtime,
    },
    comments: {
      type: "image",
      src: "/img/screenshots/home/comments.png",
      alt: "Comments",
    },
    suggestions: {
      type: "image",
      src: "/img/screenshots/home/versioning.png",
      alt: "Versioning",
    },
  };

  const tabs = [
    {
      id: "realtime",
      icon: <span>👯</span>,
      label: "Real-Time Sync",
      description: "Yjs-powered with automatic conflict resolution.",
    },
    {
      id: "comments",
      icon: <span>💬</span>,
      label: "Comments",
      description: "Inline threads and mentions keep conversations in context.",
    },
    {
      id: "suggestions",
      icon: <span>📝</span>,
      label: "Suggestions & Versioning (coming soon)",
      description:
        "Track changes, accept or reject edits. Full document history.",
    },
  ];

  return (
    <FeatureSection
      title="Local-first collaboration."
      description="First-class Yjs integration for real-time collaboration. Works offline and syncs seamlessly. Deploy anywhere."
      tabs={tabs}
      activeTabId={activeTab}
      onTabChange={(id) => setActiveTab(id as any)}
      reverse={false}
    >
      <FeatureWindow content={content[activeTab]} theme="dark" />
    </FeatureSection>
  );
};
