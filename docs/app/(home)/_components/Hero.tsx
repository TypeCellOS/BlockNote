import Link from "next/link";
import React from "react";
import { HeroVideo } from "./HeroVideo";
import { TextLoop } from "./TextLoop";

export const Hero: React.FC = () => {
  const BADGES = [
    { icon: "⭐️", text: "100k+ weekly installs" },
    { icon: "🛡️", text: "100% Open source & self-hostable" },
    { icon: "✨", text: "AI Ready" },
  ];

  return (
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
            Build a <span className="ai-gradient-text">Notion-style</span>{" "}
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
  );
};
