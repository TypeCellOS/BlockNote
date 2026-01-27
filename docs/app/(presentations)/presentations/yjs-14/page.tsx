"use client";

import { useEffect, useRef } from "react";
import Reveal from "reveal.js";
import "reveal.js/dist/reveal.css";

import { Slide1_Intro } from "./slides/Slide1_Intro";
import { Slide3_Architecture } from "./slides/Slide3_Architecture";
import { Slide5_TheEnd } from "./slides/Slide5_TheEnd";
import { SlideAttributions } from "./slides/SlideAttributions";
import { SlideDemo } from "./slides/SlideDemo";
import { SlideGitComparison } from "./slides/SlideGitComparison";
import { SlideIntroduction } from "./slides/SlideIntroduction";
import { SlideOverview } from "./slides/SlideOverview";
import { SlideProblem } from "./slides/SlideProblem";
import { SlideContentRenderer } from "./slides/SlideContentRenderer";
import { SlideDeltas } from "./slides/SlideDeltas";
import { SlideUnifiedYType } from "./slides/SlideUnifiedYType";
import { SlideYjsInternals } from "./slides/SlideYjsInternals";
import { SlideAttributionManager } from "./slides/SlideAttributionManager";
import { SlideYProsemirror } from "./slides/SlideYProsemirror";

export default function PresentationPage() {
  const deckDivRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<Reveal.Api | null>(null);

  useEffect(() => {
    if (deckDivRef.current && !deckRef.current) {
      deckRef.current = new Reveal(deckDivRef.current, {
        embedded: true,
        hash: true,
        controls: true,
        progress: true,
        center: false,
        transition: "slide",
        backgroundTransition: "fade",
      });

      deckRef.current.initialize().then(() => {
        console.log("Reveal.js initialized");
      });
    }

    return () => {
      if (deckRef.current) {
        try {
          deckRef.current.destroy();
          deckRef.current = null;
        } catch (e) {
          console.warn("Reveal.js destroy failed", e);
        }
      }
    };
  }, []);

  return (
    <div
      className="reveal font-public text-stone-900"
      ref={deckDivRef}
      style={{ height: "100vh", width: "100vw" }}
    >
      <div className="absolute left-[3vmin] top-[3vmin] z-50 flex items-center gap-2"></div>

      <div className="slides">
        <Slide1_Intro />
        <SlideOverview />

        <SlideIntroduction />
        <SlideDemo />
        <SlideProblem />
        <SlideGitComparison />
        <Slide3_Architecture />
        <SlideAttributions />
        <SlideYjsInternals />
        <SlideDeltas />
        <SlideUnifiedYType />
        <SlideAttributionManager />
        <SlideContentRenderer />
        <SlideYProsemirror />
        <Slide5_TheEnd />
      </div>

      <style jsx global>{`
        .reveal {
          font-family:
            ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji",
            "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
          color: inherit;
        }
        .reveal h1,
        .reveal h2,
        .reveal h3,
        .reveal h4,
        .reveal h5,
        .reveal h6 {
          text-transform: none;
          font-family:
            ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
          font-weight: 400;
        }
      `}</style>
    </div>
  );
}
