"use client";
import React from "react";

const pillars = [
  {
    icon: "🏛️",
    title: "Built on Giants",
    description:
      "ProseMirror and Yjs are battle-tested foundations trusted by teams worldwide, we're excited to build with these technologies.",
  },
  // {
  //   icon: "🤝",
  //   title: "Community First",
  //   description:
  //     "We collaborate closely with the Yjs team and contribute back to the ecosystem. Open source thrives on shared innovation.",
  // },
  // {
  //   icon: "🔓",
  //   title: "Yours to Own",
  //   description:
  //     "No vendor lock-in. Self-host, fork, extend. Your editing layer, under your control.",
  // },
  // {
  //   icon: "🇪🇺",
  //   title: "Digital Autonomy",
  //   description:
  //     "Partnering with DINUM (France) and Zendis (Germany) to build open European alternatives — reducing dependencies on big tech.",
  // },
  {
    icon: "⬆️",
    title: "Contributing Upstream",
    description:
      "We're significant contributors to Yjs, Hocuspocus, and Tiptap. When we improve the ecosystem, everyone benefits.",
  },
  {
    icon: "🌱",
    title: "Sustainable by Design",
    description:
      "Bootstrapped and independent. We're building for the long term, not the next funding round.",
  },
];

export const OpenSource: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-stone-900 py-24 text-white">
      {/* Subtle grid background */}
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <svg width="100%" height="100%">
          <pattern
            id="grid-pattern"
            x="0"
            y="0"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-6 font-serif text-4xl text-white md:text-5xl">
            Committed to open source.
          </h2>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-stone-300">
            Document editing is foundational infrastructure for the modern
            workforce. We believe the tools we use to create and share knowledge
            should be open, transparent, and free from lock-in. That&apos;s why
            everything we build is open source.
          </p>
        </div>

        <div className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pillars.map((pillar, index) => (
            <div
              key={index}
              className="rounded-xl border border-stone-700 bg-stone-800/50 p-6"
            >
              <div className="mb-4 text-2xl">{pillar.icon}</div>
              <h3 className="mb-2 font-semibold text-white">{pillar.title}</h3>
              <p className="text-sm leading-relaxed text-stone-400">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>

        {/* Founder Quote */}
        {/* <div className="mb-12 text-center">
          <blockquote className="mx-auto max-w-2xl">
            <p className="mb-4 font-serif text-xl italic text-stone-300">
              "Here we could put a quote about our open source commitment."
            </p>
            <footer className="text-sm text-stone-500">— Cool person</footer>
          </blockquote>
        </div> */}

        <div className="flex justify-center">
          <a
            href="https://github.com/TypeCellOS/BlockNote"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-medium text-stone-900 transition-all hover:bg-stone-100"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            <span>View on GitHub</span>
          </a>
        </div>
      </div>
    </section>
  );
};
