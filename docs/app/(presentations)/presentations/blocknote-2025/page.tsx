"use client";

import { useEffect, useRef } from "react";
import Reveal from "reveal.js";
import "reveal.js/dist/reveal.css";
// We use the white theme as a base, but we override it with our own Tailwind styles
// import "reveal.js/dist/theme/white.css";

// Import slides
import { Slide1 } from "./slides/Slide1";

import { AgendaSlide } from "./slides/AgendaSlide";

import { SlideFunding } from "./slides/SlideFunding";
import { SlideWhyBlockNote } from "./slides/SlideWhyBlockNote";

import { SlideAI } from "./slides/SlideAI";
import { SlideAgentDemo } from "./slides/SlideAgentDemo";
import { SlideComments } from "./slides/SlideComments";
import { SlideDemo } from "./slides/SlideDemo";
import { SlideKeyNumbers } from "./slides/SlideKeyNumbers";
import { SlideNewDevelopments } from "./slides/SlideNewDevelopments";
import { SlideRoadmap } from "./slides/SlideRoadmap";
import { SlideSuggestions } from "./slides/SlideSuggestions";
import { SlideThankYou } from "./slides/SlideThankYou";
import { SlideVersionDemo } from "./slides/SlideVersionDemo";
import { SlideWhyBlocks } from "./slides/SlideWhyBlocks";

export default function PresentationPage() {
  const deckDivRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<Reveal.Api | null>(null);

  useEffect(() => {
    if (deckDivRef.current && !deckRef.current) {
      // Initialize reveal.js
      deckRef.current = new Reveal(deckDivRef.current, {
        embedded: true, // We are running in a React app, so embedded mode is often safer for routing
        hash: true,
        controls: true,
        progress: true,
        center: false,
        transition: "slide", // none/fade/slide/convex/concave/zoom
        backgroundTransition: "fade",
        width: 1280,
        height: 720,
      });

      deckRef.current.initialize().then(() => {
        console.log("Reveal.js initialized");
      });
    }

    // Cleanup on unmount
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
    // The "reveal" class is required by reveal.js
    // We set layout to fill the screen explicitly to ensure reveal takes full height
    <div
      className="reveal font-public text-stone-900"
      ref={deckDivRef}
      style={{ height: "100vh", width: "100vw" }}
    >
      <div className="slide-logo absolute left-[3vmin] top-[3vmin] z-50 flex items-center gap-2">
        <img
          src="/img/logos/banner.svg"
          alt="BlockNote Logo"
          className="h-[3.5vmin]"
        />
      </div>

      <div className="slides">
        <Slide1 />
        <AgendaSlide />
        <SlideWhyBlockNote />
        <SlideFunding />
        <SlideWhyBlocks />
        <SlideDemo />
        <SlideKeyNumbers />
        <SlideNewDevelopments />
        <SlideComments />
        <SlideAI />
        <SlideAgentDemo />
        <SlideSuggestions />
        <SlideVersionDemo />
        <SlideRoadmap />
        <SlideThankYou />
      </div>

      {/* Global CSS overrides for this presentation to match site font */}
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
        .slide-logo {
          transition: opacity 0.3s;
        }
        .reveal.hide-logo .slide-logo {
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
