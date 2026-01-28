import React, { useState } from "react";
import { FeatureSection } from "./FeatureSection";
import { ContentItem, FeatureWindow } from "./ui/FeatureWindow";

export const FeatureDX: React.FC<{
  code: { theming: string; extend: string };
}> = ({ code }) => {
  const [activeTab, setActiveTab] = useState<"types" | "theming" | "extend">(
    "types",
  );

  const content: Record<string, ContentItem> = {
    types: {
      type: "image",
      src: "/img/screenshots/home/code-typescript-support.png",
      alt: "Type-Safe Schema",
    },
    theming: {
      type: "code",
      file: "Editor.tsx",
      code: code.theming,
    },
    extend: {
      type: "code",
      file: "CustomBlock.tsx",
      code: code.extend,
    },
  };

  const tabs = [
    {
      id: "types",
      icon: <span>📐</span>,
      label: "Type-Safe",
      description: "Full autocompletion and type inference for custom schemas.",
    },
    {
      id: "theming",
      icon: <span>🎨</span>,
      label: "Bring your Design System",
      description: "Works with Mantine, shadcn/ui, or go headless.",
    },
    {
      id: "extend",
      icon: <span>🔧</span>,
      label: "Extend Everything",
      description: "Create custom blocks, inline content, menus and more.",
    },
  ];

  return (
    <FeatureSection
      title="An intuitive API for developers."
      description="The block-based architecture unlocks a powerful API for engineers with full TypeScript support and a clean React API."
      tabs={tabs}
      activeTabId={activeTab}
      onTabChange={(id) => setActiveTab(id as any)}
      reverse={true}
    >
      <FeatureWindow content={content[activeTab]} theme="dark" />
    </FeatureSection>
  );
};
