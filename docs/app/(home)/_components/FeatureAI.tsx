import React, { useState } from "react";
import { FeatureSection } from "./FeatureSection";
import { ContentItem, FeatureWindow } from "./ui/FeatureWindow";

export const FeatureAI: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"toolbar" | "models" | "human">(
    "toolbar",
  );

  const content: Record<string, ContentItem> = {
    toolbar: {
      type: "video",
      src: "/video/ai-select.mp4",
      className: "object-contain px-4",
    },
    models: {
      type: "image",
      src: "/img/screenshots/home/any_model.png",
      alt: "Bring Any Model",
    },
    human: {
      type: "image",
      src: "/img/screenshots/home/human_in_the_loop.png",
      alt: "Human in the Loop",
    },
  };

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
      <FeatureWindow content={content[activeTab]} theme="light" />
    </FeatureSection>
  );
};
