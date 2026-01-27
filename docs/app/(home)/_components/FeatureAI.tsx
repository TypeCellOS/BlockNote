"use client";
import React, { useState } from "react";
import { FeatureSection } from "./FeatureSection";

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
      description: "Connect OpenAI, Anthropic, or your own endpoints.",
    },
    {
      id: "human",
      icon: <span>🤝</span>,
      label: "Human in the Loop",
      description: "Users accept, reject, or refine AI suggestions.",
    },
  ];

  return (
    <FeatureSection
      title="Build for What's Next."
      description="Build the future of document editing. Let users co-author with AI. Connect any model and integrate RAG, tools, and agents: powered by the AI SDK."
      tabs={tabs}
      activeTabId={activeTab}
      onTabChange={(id) => setActiveTab(id as any)}
      reverse={true}
    >
      {activeTab === "models" || activeTab === "human" ? (
        <img
          src={
            activeTab === "models"
              ? "/img/screenshots/home/any_model.png"
              : "/img/screenshots/home/human_in_the_loop.png"
          }
          alt={activeTab === "models" ? "Bring Any Model" : "Human in the Loop"}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="relative h-[380px] w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
            </div>
          </div>
          <div className="relative h-full w-full bg-white">
            <video
              src="/video/ai-select.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full object-contain px-4"
            />
          </div>
        </div>
      )}
    </FeatureSection>
  );
};
