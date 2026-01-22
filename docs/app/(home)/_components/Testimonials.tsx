"use client";
import Link from "next/link";
import React from "react";

interface Testimonial {
  company: string;
  quote: string;
  author: string;
  role: string;
}

const testimonials: Testimonial[] = [
  {
    company: "Acme Corp",
    quote:
      "BlockNote let us ship a polished editor in days instead of months. Our users love it.",
    author: "Sarah Chen",
    role: "VP Engineering",
  },
  {
    company: "Startup Inc",
    quote:
      "We evaluated every rich text editor on the market. BlockNote was the only one that felt modern.",
    author: "Marcus Johnson",
    role: "CTO",
  },
  {
    company: "Enterprise Co",
    quote:
      "The TypeScript support is exceptional. Our team was productive from day one.",
    author: "Elena Rodriguez",
    role: "Lead Developer",
  },
];

import { SpotlightCard } from "./SpotlightCard";

const TestimonialCard: React.FC<{ testimonial: Testimonial }> = ({
  testimonial,
}) => (
  <SpotlightCard className="flex flex-col rounded-2xl p-6 shadow-sm transition-shadow hover:shadow-md">
    <div className="mb-4 font-semibold text-stone-900">
      {testimonial.company}
    </div>
    <p className="mb-6 flex-1 text-sm leading-relaxed text-stone-500">
      "{testimonial.quote}"
    </p>
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-sm font-medium text-stone-600">
        {testimonial.author
          .split(" ")
          .map((n) => n[0])
          .join("")}
      </div>
      <div>
        <div className="text-sm font-medium text-stone-900">
          {testimonial.author}
        </div>
        <div className="text-xs text-stone-400">
          {testimonial.role}, {testimonial.company}
        </div>
      </div>
    </div>
  </SpotlightCard>
);

export const Testimonials: React.FC = () => {
  return (
    <section className="bg-stone-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-serif text-4xl text-stone-900">
            Trusted by teams everywhere.
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-stone-500">
            From startups to enterprises, teams choose BlockNote to build their
            document experiences.
          </p>
        </div>

        <div className="mb-12 grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} />
          ))}
        </div>

        <div className="flex justify-center">
          <Link
            href="/examples"
            className="group flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-8 py-4 font-medium text-stone-900 shadow-sm transition-all hover:border-purple-300 hover:shadow-md"
          >
            <span>See who's using BlockNote</span>
            <span className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
};
