"use client";
import React, { useState } from "react";
import { FeatureSection } from "./FeatureSection";

export const FeatureUX: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"components" | "ai" | "blocks">(
    "components",
  );

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

  const getVideo = () => {
    switch (activeTab) {
      case "components":
        return "/video/batteries-included.mp4";
      case "ai":
        return "/video/ai-select.mp4";
      case "blocks":
        return "/video/dragdrop.mp4";
      default:
        return "";
    }
  };

  return (
    <FeatureSection
      title="A modern editor, ready to ship."
      description="Built-in components provide a complete, block-based editing experience out of the box. Customize everything when you need to."
      tabs={tabs}
      activeTabId={activeTab}
      onTabChange={(id) => setActiveTab(id as any)}
      reverse={false}
    >
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
            key={activeTab}
            src={getVideo()}
            autoPlay
            loop
            muted
            playsInline
            className={`h-full w-full ${activeTab === "ai" ? "object-contain px-4" : "object-cover"}`}
          />
        </div>
      </div>
    </FeatureSection>
  );
};
