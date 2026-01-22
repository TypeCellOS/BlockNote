"use client";
import React, { useState } from "react";
import { FeatureSection } from "./FeatureSection";
import { MockEditor } from "./Shared";

export const FeatureUX: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"components" | "ai" | "blocks">(
    "components",
  );

  const tabs = [
    {
      id: "components",
      icon: <span>⚡️</span>,
      label: "Ready to Use",
      description:
        "Slash menus, formatting toolbars, and drag handles work instantly.",
    },
    {
      id: "ai",
      icon: <span>✨</span>,
      label: "AI Assistance",
      description: "Select text, ask AI. Completions and edits built-in.",
    },
    {
      id: "blocks",
      icon: <span>🧱</span>,
      label: "Block-Based",
      description: "Drag, drop, and nest content blocks.",
    },
  ];

  const getEditorState = () => {
    switch (activeTab) {
      case "components":
        return {
          body: (
            <>
              Type '<strong>/</strong>' for commands...
            </>
          ),
          cursorVisible: true,
          aiSelection: false,
          aiPopupVisible: false,
        };
      case "ai":
        return {
          body: (
            <>
              <span className="rounded bg-purple-100 px-0.5 text-purple-900">
                BlockNote is a text editor.
              </span>
            </>
          ),
          cursorVisible: false,
          aiSelection: true,
          aiPopupVisible: true,
        };
      case "blocks":
        return {
          body: (
            <>
              <div className="mb-2 flex items-center gap-2 rounded bg-stone-100 p-2">
                <span className="text-stone-400">⋮⋮</span>
                <span>Drag blocks to reorder content.</span>
              </div>
              <div>Nest blocks to create structure.</div>
            </>
          ),
          cursorVisible: false,
          aiSelection: false,
          aiPopupVisible: false,
        };
      default:
        return {};
    }
  };

  const editorState = getEditorState();

  return (
    <FeatureSection
      title="A modern editor, ready to ship."
      description="Built-in components provide a Notion-style editing experience out of the box. Customize everything when you need to."
      tabs={tabs}
      activeTabId={activeTab}
      onTabChange={(id) => setActiveTab(id as any)}
      reverse={false}
    >
      <MockEditor
        title="Demo Editor"
        body={editorState.body}
        cursorVisible={editorState.cursorVisible}
        aiSelection={editorState.aiSelection}
        aiPopupVisible={editorState.aiPopupVisible}
        className="h-[380px] border-none"
      />
    </FeatureSection>
  );
};
