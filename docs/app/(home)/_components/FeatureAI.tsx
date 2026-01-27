"use client";
import React, { useState } from "react";
import { FeatureSection } from "./FeatureSection";
import { MockEditor } from "./Shared";

export const FeatureAI: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"toolbar" | "models" | "human">(
    "toolbar",
  );

  const tabs = [
    {
      id: "toolbar",
      icon: <span>✨</span>,
      label: "AI in the Editor",
      description:
        "Context-aware completions and edits directly in the document.",
    },
    {
      id: "models",
      icon: <span>🔌</span>,
      label: "Bring Any Model",
      description: "Connect your own LLM endpoints.",
    },
    {
      id: "human",
      icon: <span>🤝</span>,
      label: "Human in the Loop",
      description: "Users accept, reject, or refine AI suggestions.",
    },
  ];

  const getEditorState = () => {
    switch (activeTab) {
      case "toolbar":
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
      case "models":
        return {
          body: (
            <>
              Connect to <strong>OpenAI</strong>, <strong>Anthropic</strong>, or
              your own inference endpoints.
            </>
          ),
          cursorVisible: false,
          aiSelection: false,
          aiPopupVisible: false,
        };
      case "human":
        return {
          body: (
            <>
              <div className="mb-3 rounded border border-green-200 bg-green-50 p-2 text-green-800">
                <span className="font-medium">AI Suggestion:</span> Improved
                version of your text...
              </div>
              <div className="flex gap-2">
                <button className="rounded bg-green-600 px-3 py-1 text-xs text-white">
                  Accept
                </button>
                <button className="rounded bg-stone-200 px-3 py-1 text-xs text-stone-600">
                  Reject
                </button>
              </div>
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
      title="Built for What's Next."
      description="Build the future of document editing. Let users co-author with AI. Connect any model and integrate RAG, tools, and agents—powered by the AI SDK."
      tabs={tabs}
      activeTabId={activeTab}
      onTabChange={(id) => setActiveTab(id as any)}
      reverse={true}
    >
      <MockEditor
        title="AI Editor"
        body={editorState.body}
        cursorVisible={editorState.cursorVisible}
        aiSelection={editorState.aiSelection}
        aiPopupVisible={editorState.aiPopupVisible}
        className="h-[380px] border-none"
      />
    </FeatureSection>
  );
};
