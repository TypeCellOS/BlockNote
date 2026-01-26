"use client";
import Link from "next/link";
import React from "react";
import { BlockCatalog } from "./BlockCatalog";
import { DigitalCommons } from "./DigitalCommons";
import { FAQ } from "./FAQ";
import { FeatureAI } from "./FeatureAI";
import { FeatureCollab } from "./FeatureCollab";
import { FeatureDX } from "./FeatureDX";
import { FeatureUX } from "./FeatureUX";
import { HeroVideo } from "./HeroVideo";
import { Letter } from "./Letter";
import { Marquee } from "./Marquee";
import { OpenSource } from "./OpenSource";
import { Pricing } from "./Pricing";
import { SpotlightCard } from "./SpotlightCard";
import { Testimonials } from "./Testimonials";
import { TextLoop } from "./TextLoop";

export const HomeContent: React.FC = () => {
  const BADGES = [
    { icon: "⭐️", text: "100k+ weekly installs" },
    { icon: "🛡️", text: "100% Open source & self-hostable" },
    { icon: "✨", text: "AI Ready" },
  ];

  return (
    <div className="bg-ai-bg text-ai-text font-public flex flex-col overflow-x-hidden selection:bg-purple-100 selection:text-purple-900">
      {/* Styles for custom animations */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes marquee2 {
          0% { transform: translateX(100%); }
          100% { transform: translateX(0%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        .animate-marquee2 {
          animation: marquee2 25s linear infinite;
        }
        @keyframes float-up-fade {
          0% { transform: translateY(0); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(-60px); opacity: 0; }
        }
        @keyframes pulse-aura {
          0% { box-shadow: 0 0 0 0px rgba(168, 85, 247, 0.0); }
          50% { box-shadow: 0 0 20px 10px rgba(168, 85, 247, 0.1); }
          100% { box-shadow: 0 0 0 0px rgba(168, 85, 247, 0.0); }
        }
        @keyframes flow-line {
          0% { stroke-dashoffset: 200; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>
      <div className="w-full bg-[#fdfbf7]">
        {/* Hero Section */}
        <section className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-6 py-24 lg:grid-cols-2 lg:gap-20">
          {/* Passive Neural Background */}
          <div>
            {/* Badge */}
            <TextLoop interval={5}>
              {BADGES.map((badge, index) => (
                <div
                  key={index}
                  className="mb-8 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white/60 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-purple-700 backdrop-blur-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">{badge.icon}</span>
                    {badge.text}
                  </span>
                </div>
              ))}
            </TextLoop>

            <h1 className="mb-8 text-balance font-serif text-5xl leading-[1.05] tracking-tight text-stone-900 md:text-7xl">
              Build a <span className="ai-gradient-text">Notion-quality</span>{" "}
              editor in minutes.
            </h1>
            <p className="mb-10 max-w-lg text-lg font-light leading-relaxed text-stone-600 md:text-xl">
              The <strong>AI-native</strong>, <strong>open source</strong> rich
              text editor for <strong>React</strong>. Add a{" "}
              <strong>fully customizable</strong> modern block-based editing
              experience to your product that users will love.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/demo"
                className="group flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-8 py-3.5 font-medium text-stone-900 shadow-sm transition-all hover:border-purple-300 hover:shadow-lg"
              >
                <span>View Demo</span>
                <span className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <Link
                href="/docs"
                className="flex items-center gap-2 rounded-xl px-6 py-3.5 font-medium text-stone-500 transition-colors hover:text-stone-900"
              >
                Documentation
              </Link>
            </div>
          </div>
          <div className="relative w-full md:ml-auto md:mr-4 lg:mt-12 lg:w-[85%]">
            <HeroVideo />
          </div>
        </section>
      </div>
      {/* Tech Stack Marquee */}
      <section className="border-y border-stone-100 bg-stone-50/50 py-10">
        <div className="mx-auto max-w-7xl overflow-hidden">
          <div className="mb-6 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-stone-400">
              Integrates with your stack (TBD)
            </span>
          </div>
          <Marquee />
        </div>
      </section>

      {/* Feature Grid with Spotlight Effect */}
      <section className="bg-white/50 py-24 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-20 max-w-2xl text-center">
            <h2 className="mb-6 font-serif text-4xl text-stone-900">
              ?? The editor you'd build, if you had the time.
            </h2>
            <p className="text-lg text-stone-500">
              BlockNote combines a premium editing experience with the
              flexibility of open standards. Zero compromise.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <SpotlightCard className="group p-8 shadow-xl shadow-stone-200/50">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-purple-100 bg-purple-50 text-2xl text-purple-600 transition-transform duration-500 group-hover:scale-110">
                ✨
              </div>
              <h3 className="mb-3 font-serif text-2xl text-stone-900">
                ?? Notion-Quality UX
              </h3>
              <p className="relative z-10 mb-6 text-stone-500">
                Give your users the modern, block-based experience they expect.
                Slash commands, drag-and-drop, and real-time collaboration.
              </p>
              <div className="rounded-lg border border-stone-100 bg-stone-50 p-4 font-mono text-xs text-stone-400">
                /image
                <br />
                <span className="text-purple-500">Uploading...</span>
              </div>
            </SpotlightCard>

            <SpotlightCard className="group p-8 shadow-xl shadow-stone-200/50">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-2xl text-blue-600 transition-transform duration-500 group-hover:scale-110">
                🛡️
              </div>
              <h3 className="mb-3 font-serif text-2xl text-stone-900">
                ?? Sovereign Infrastructure
              </h3>
              <p className="relative z-10 mb-6 text-stone-500">
                ?? 100% open source and self-hostable. Own your data, extend the
                core, and never worry about platform risk.
              </p>
              <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">
                  MIT / MPL
                </span>
                <span className="rounded bg-stone-100 px-2 py-1 text-stone-600">
                  Local-First
                </span>
              </div>
            </SpotlightCard>

            <SpotlightCard className="group p-8 shadow-xl shadow-stone-200/50">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-2xl text-amber-600 transition-transform duration-500 group-hover:scale-110">
                🧠
              </div>
              <h3 className="mb-3 font-serif text-2xl text-stone-900">
                ?? Intelligence You Own
              </h3>
              <p className="relative z-10 mb-6 text-stone-500">
                Add AI features like autocomplete and rewriting without leaking
                data. Bring your own model, run it anywhere.
              </p>
              <div className="flex justify-center gap-2 rounded-lg border border-stone-100 bg-stone-50 p-2">
                <div className="h-2 w-2 rounded-full bg-stone-300"></div>
                <div className="h-2 w-16 rounded-full bg-stone-200"></div>
                <div className="h-2 w-4 rounded-full bg-amber-200"></div>
              </div>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* Digital Commons */}
      <DigitalCommons />

      {/* Feature Pillars */}
      <div className="space-y-32 bg-white/50 py-32 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6">
          <FeatureUX />
        </div>
        <div className="mx-auto max-w-6xl px-6">
          <FeatureDX />
        </div>
        <div className="mx-auto max-w-6xl px-6">
          <FeatureCollab />
        </div>
        <div className="mx-auto max-w-6xl px-6">
          <FeatureAI />
        </div>
      </div>
      {/* Testimonials */}
      <Testimonials />
      {/* Open Source */}
      <OpenSource />
      {/* Pricing */}
      <Pricing />
      {/* Blocks Catalog */}
      <BlockCatalog />
      {/* Letter from Creators */}
      <Letter />

      {/* FAQ */}
      <FAQ />
    </div>
  );
};
