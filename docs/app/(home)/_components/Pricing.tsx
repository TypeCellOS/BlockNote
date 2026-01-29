import Link from "next/link";
import React from "react";
import { Sponsors } from "./Sponsors";

export const Pricing: React.FC = () => {
  return (
    <section className="bg-gradient-to-b from-white to-stone-50 py-24">
      <div className="mx-auto max-w-4xl px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-purple-600">
            Transparent pricing
          </p>
          <h2 className="mb-6 font-serif text-4xl text-stone-900 md:text-5xl">
            Subscribe to BlockNote XL.
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-stone-500">
            BlockNote is 100% open source. Here's how licensing works.
          </p>
        </div>

        {/* Two-part explainer */}
        <div className="mb-12 grid gap-6 md:grid-cols-2">
          {/* Core */}
          <div className="rounded-2xl border border-stone-200 bg-white p-8">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-2xl">💚</span>
              <h3 className="text-xl font-semibold text-stone-900">
                Core Editor
              </h3>
            </div>
            <p className="mb-6 text-stone-600">
              The majority of BlockNote (including all blocks, real-time
              collaboration, comments, and UI components) are liberally
              licensed.
            </p>
            <p className="mb-6 text-stone-600">
              Free to use in any project; personal, open source, or commercial.
            </p>
            <p className="text-sm font-medium text-green-600">
              ✓ Free for everyone
            </p>
          </div>

          {/* XL */}
          <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-8">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <h3 className="text-xl font-semibold text-stone-900">
                XL Packages
              </h3>
            </div>
            <p className="mb-4 text-stone-600">
              Advanced features like <strong>AI integration</strong>,{" "}
              <strong>PDF / Word / ODT exports</strong>, and{" "}
              <strong>multi-column layouts</strong>.
            </p>
            <p className="mb-6 text-stone-600">
              Free for open source projects under GPL-3.0. Closed source
              projects require a subscription.
            </p>
            <p className="text-sm font-medium text-purple-600">
              ✓ Free for open source
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mb-16 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-8 py-4 font-medium text-white transition-all hover:bg-purple-700"
          >
            <span>View Pricing</span>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>

        {/* Sponsors */}
        <Sponsors title="Thanks to our supporters for helping us build sustainable open source software." />
      </div>
    </section>
  );
};
