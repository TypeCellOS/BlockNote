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
import { WebrtcProvider } from "y-webrtc";

const doc = new Y.Doc();
const provider = new WebrtcProvider("room-id", doc);

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
      code: `// Add inline comment threads
editor.comments.add({
  blockId: "block-123",
  content: "Can we clarify this section?",
  author: currentUser,
});

// Subscribe to comment updates
editor.comments.onChange((comments) => {
  updateCommentSidebar(comments);
});`,
    },
    suggestions: {
      file: "Suggestions.tsx",
      code: `// Enable suggestion mode
editor.suggestions.enable();

// All edits are now tracked as suggestions
const pending = editor.suggestions.getPending();

// Accept or reject changes
editor.suggestions.accept(pending[0].id);
editor.suggestions.reject(pending[1].id);

// Review history and versions`,
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
      label: "Suggestions & Versioning",
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

      {/* Code */}
      <div className="min-h-[300px] overflow-x-auto bg-[#0F0F11] p-6">
        <pre className="whitespace-pre font-mono text-sm leading-relaxed text-stone-300">
          {content[activeTab].code}
        </pre>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0F0F11] to-transparent"></div>
    </FeatureSection>
  );
};
