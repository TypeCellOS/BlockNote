"use client";
import React, { useState } from "react";
import { FeatureSection } from "./FeatureSection";

export const FeatureCollab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "realtime" | "comments" | "suggestions"
  >("realtime");

  const content = {
    realtime: {
      file: "CollaborativeEditor.tsx",
      code: `import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const doc = new Y.Doc();
const provider = new WebsocketProvider(
  "ws://localhost:1234", "room-id", doc);

const editor = useCreateBlockNote({
  collaboration: {
    fragment: doc.getXmlFragment("document"),
    user: { name: "Alice", color: "#ff0000" },
    provider,
  }
});

// Cursors and presence included`,
    },
    comments: {
      file: "Comments.tsx",
      code: "", // Using image override
    },
    suggestions: {
      file: "History.tsx",
      code: "", // Using image override
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
      {/* Window Chrome */}
      {activeTab !== "suggestions" && activeTab !== "comments" && (
        <div className="flex items-center justify-between border-b border-white/5 bg-[#18181B] px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F56]"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-[#27C93F]"></div>
          </div>
          <span className="font-mono text-xs text-stone-500">
            {content[activeTab].file}
          </span>
          <div className="w-4"></div>
        </div>
      )}

      {/* Code */}
      <div
        className={`min-h-[300px] overflow-x-auto bg-[#0F0F11] ${activeTab === "realtime" ? "p-6" : ""}`}
      >
        {activeTab === "suggestions" ? (
          <img
            src="/img/screenshots/home/versioning.png"
            alt="Versioning"
            className="w-full rounded-md"
          />
        ) : activeTab === "comments" ? (
          <img
            src="/img/screenshots/home/comments.png"
            alt="Comments"
            className="w-full rounded-md"
          />
        ) : (
          <pre className="whitespace-pre font-mono text-sm leading-relaxed text-stone-300">
            {content[activeTab].code}
          </pre>
        )}
      </div>
    </FeatureSection>
  );
};
