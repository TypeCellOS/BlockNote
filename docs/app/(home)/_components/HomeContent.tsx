"use client";
import Link from "next/link";
import React from "react";
import { FAQ } from "./FAQ";
import { FeatureAI } from "./FeatureAI";
import { FeatureCollab } from "./FeatureCollab";
import { FeatureDX } from "./FeatureDX";
import { FeatureUX } from "./FeatureUX";
import { Letter } from "./Letter";
import { Marquee } from "./Marquee";
import { OpenSource } from "./OpenSource";
import { Pricing } from "./Pricing";
import { SpotlightCard } from "./SpotlightCard";
import { Testimonials } from "./Testimonials";
import { TextLoop } from "./TextLoop";

const BlockCatalogItem: React.FC<{ name: string; icon: React.ReactNode }> = ({
  name,
  icon,
}) => (
  <div className="group flex cursor-default flex-col items-center justify-center rounded-2xl border border-stone-100 bg-white p-4 transition-all duration-300 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-500/5">
    <div className="mb-3 h-10 w-10 text-stone-400 transition-colors group-hover:text-purple-500">
      {icon}
    </div>
    <span className="text-xs font-medium text-stone-500 group-hover:text-stone-900">
      {name}
    </span>
  </div>
);

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
        <section className="relative mx-auto grid w-full max-w-7xl items-center gap-20 px-6 py-24 lg:grid-cols-2">
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
                href="/examples"
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

          <div className="relative h-[450px]">
            {/* Editor Placeholder */}
            <div className="flex h-full w-full items-center justify-center rounded-xl border-2 border-dashed border-stone-200 bg-white/50">
              <div className="text-center">
                <div className="mb-2 text-2xl">✨</div>
                <p className="text-sm font-medium text-stone-400">
                  Editor Demo Coming Soon
                </p>
              </div>
            </div>
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
      <section className="relative overflow-hidden bg-gradient-to-b from-stone-50 to-white py-24">
        {/* Subtle decorative elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-purple-100/40 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-amber-100/40 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-purple-600">
              Built-in Blocks
            </p>
            <h2 className="mb-6 font-serif text-4xl text-stone-900 md:text-5xl">
              A universe of blocks.
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-stone-500">
              Every BlockNote document is a collection of blocks—headings,
              lists, images, and more. Use the built-in blocks, customize them
              to fit your needs, or create entirely new ones.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            <BlockCatalogItem
              name="Heading"
              icon={
                <svg
                  className="h-full w-full"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16m-7 6h7"
                  />
                </svg>
              }
            />
            <BlockCatalogItem
              name="Paragraph"
              icon={
                <svg
                  className="h-full w-full"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              }
            />
            <BlockCatalogItem
              name="List"
              icon={
                <svg
                  className="h-full w-full"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              }
            />
            <BlockCatalogItem
              name="Image"
              icon={
                <svg
                  className="h-full w-full"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              }
            />
            <BlockCatalogItem
              name="Video"
              icon={
                <svg
                  className="h-full w-full"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              }
            />
            <BlockCatalogItem
              name="Table"
              icon={
                <svg
                  className="h-full w-full"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M3 14h18m-9-4v8m-7-4h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"
                  />
                </svg>
              }
            />
            <BlockCatalogItem
              name="Code"
              icon={
                <svg
                  className="h-full w-full"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              }
            />
            <BlockCatalogItem
              name="File"
              icon={
                <svg
                  className="h-full w-full"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
            />
            <BlockCatalogItem
              name="Audio"
              icon={
                <svg
                  className="h-full w-full"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              }
            />
            <BlockCatalogItem
              name="Checklist"
              icon={
                <svg
                  className="h-full w-full"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              }
            />
            <BlockCatalogItem
              name="Quote"
              icon={
                <svg
                  className="h-full w-full"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
              }
            />
            <BlockCatalogItem
              name="Your Own"
              icon={
                <svg
                  className="h-full w-full"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              }
            />
          </div>
        </div>
      </section>
      {/* Letter from Creators */}
      <Letter />

      {/* FAQ */}
      <FAQ />
    </div>
  );
};
