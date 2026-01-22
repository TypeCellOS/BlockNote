"use client";
import React, { useState } from "react";
import { FeatureSection } from "./FeatureSection";

export const FeatureDX: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"types" | "theming" | "extend">(
    "types",
  );

  const content = {
    types: {
      file: "schema.ts",
      code: `import { BlockNoteSchema } from "@blocknote/core";

// Define your custom block schema
const schema = BlockNoteSchema.create({
  blockSpecs: {
    alert: AlertBlock,
    callout: CalloutBlock,
  },
});

// Full type inference for your blocks
type MyBlock = typeof schema.Block;
//   ^? { type: "alert" | "callout" | ... }`,
    },
    theming: {
      file: "Editor.tsx",
      code: `import { useCreateBlockNote } from "@blocknote/react";
import { ShadCNComponents } from "@blocknote/shadcn";

// Use your design system
const editor = useCreateBlockNote();

return (
  <BlockNoteView
    editor={editor}
    theme="light"
    components={ShadCNComponents}
  />
);`,
    },
    extend: {
      file: "CustomBlock.tsx",
      code: `import { createReactBlockSpec } from "@blocknote/react";

// Create custom blocks with React
export const AlertBlock = createReactBlockSpec({
  type: "alert",
  propSchema: {
    type: { default: "warning" },
  },
  content: "inline",
}, {
  render: (props) => (
    <div className="alert">
      {props.contentRef}
    </div>
  ),
});`,
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
      label: "Use Your Stack",
      description: "Works with Mantine, Shadcn/ui, or go headless.",
    },
    {
      id: "extend",
      icon: <span>🔧</span>,
      label: "Extend Everything",
      description: "Create custom blocks, inline content, and plugins.",
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
