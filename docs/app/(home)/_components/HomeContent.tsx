import React from "react";
import { BlockCatalog } from "./BlockCatalog";
import { DigitalCommons } from "./DigitalCommons";
import { FeatureAI } from "./FeatureAI";
import { FeatureCollab } from "./FeatureCollab";
import { FeatureDX } from "./FeatureDX";
import { FeatureUX } from "./FeatureUX";
import { Hero } from "./Hero";
import { OpenSource } from "./OpenSource";
import { Pricing } from "./Pricing";
import { Sponsors } from "./Sponsors";
import { USP } from "./USP";

type HomeContentProps = {
  code: {
    realtime: string;
    theming: string;
    extend: string;
    // types: string;
  };
};

export const HomeContent: React.FC<HomeContentProps> = ({ code }) => {
  return (
    <div className="bg-ai-bg text-ai-text font-public flex flex-col overflow-x-hidden selection:bg-purple-100 selection:text-purple-900">
      <Hero />
      <Sponsors />
      <div className="w-full bg-[#fdfbf7]"></div>

      {/* Feature Grid with Spotlight Effect */}
      <USP />

      {/* Digital Commons */}
      <DigitalCommons />

      {/* Feature Pillars */}
      <div className="space-y-32 bg-white/50 py-32 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6">
          <FeatureUX />
        </div>
        <div className="mx-auto max-w-6xl px-6">
          <FeatureDX
            code={{
              theming: code.theming,
              extend: code.extend,
              // types: code.types,
            }}
          />
        </div>
        <div className="mx-auto max-w-6xl px-6">
          <FeatureCollab code={{ realtime: code.realtime }} />
        </div>
        <div className="mx-auto max-w-6xl px-6">
          <FeatureAI />
        </div>
      </div>
      {/* Open Source */}
      <OpenSource />
      {/* Pricing */}
      <Pricing />
      {/* Blocks Catalog */}
      <BlockCatalog />
    </div>
  );
};
