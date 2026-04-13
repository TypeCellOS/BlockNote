import React from "react";

interface FeatureTab {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}

interface FeatureSectionProps {
  title: string;
  description: string;
  tabs: FeatureTab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  // The content to display on the right side (Visual or Code)
  children: React.ReactNode;
  // Optional: Swap order for visual variety (Left/Right)
  reverse?: boolean;
}

export const FeatureSection: React.FC<FeatureSectionProps> = ({
  title,
  description,
  tabs,
  activeTabId,
  onTabChange,
  children,
  reverse = false,
}) => {
  return (
    <div
      className={`flex flex-col items-start gap-12 lg:flex-row ${
        reverse ? "lg:flex-row-reverse" : ""
      }`}
    >
      {/* Left Text & Tabs */}
      <div className="flex-1">
        <h2 className="mb-6 font-serif text-3xl text-stone-900 md:text-4xl">
          {title}
        </h2>
        <p className="mb-8 text-lg leading-relaxed text-stone-500">
          {description}
        </p>

        <div className="space-y-4">
          {tabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            // Dynamic styles based on active state could be passed or handled here
            // For simplicity, we'll use a generic active style or specific color logic if needed.
            // But CodePlayground had specific colors (purple, amber, blue).
            // Let's rely on the parent or use a generic active style here for now,
            // or we can add a 'color' prop to FeatureTab if we want distinct colors per tab.

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex w-full cursor-pointer items-center gap-4 rounded-xl border p-4 text-left transition-all duration-300 ${
                  isActive
                    ? "border-stone-200 bg-stone-50 shadow-sm"
                    : "border-transparent bg-white hover:bg-stone-50"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl ${
                    isActive
                      ? "bg-white text-stone-900 shadow-sm"
                      : "bg-stone-100 text-stone-400"
                  }`}
                >
                  {tab.icon}
                </div>
                <div>
                  <div
                    className={`font-bold ${
                      isActive ? "text-stone-900" : "text-stone-500"
                    }`}
                  >
                    {tab.label}
                  </div>
                  <div className="text-xs text-stone-400">
                    {tab.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Visual */}
      <div className="perspective-1000 group relative w-full flex-1 lg:pt-16">
        {/* <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-stone-200 to-purple-200 opacity-20 blur transition duration-1000 group-hover:opacity-40"></div> */}
        <div className="group-hover:rotate-y-2 relative transform overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl transition-transform duration-500">
          {children}
        </div>
      </div>
    </div>
  );
};
