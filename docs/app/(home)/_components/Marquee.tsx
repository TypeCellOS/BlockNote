import React from "react";
import { FrameworkPill } from "./FrameworkPill";

export const Marquee: React.FC = () => (
  <div className="group relative flex overflow-x-hidden">
    <div className="animate-marquee flex gap-6 whitespace-nowrap py-4">
      <FrameworkPill name="React" color="bg-blue-400" />
      <FrameworkPill name="Next.js" color="bg-black" />
      <FrameworkPill name="Y.js" color="bg-amber-400" />
      <FrameworkPill name="Supabase" color="bg-green-400" />
      <FrameworkPill name="Remix" color="bg-indigo-400" />
      <FrameworkPill name="Astro" color="bg-orange-400" />
      <FrameworkPill name="Vite" color="bg-purple-400" />
      {/* Duplicates */}
      <FrameworkPill name="React" color="bg-blue-400" />
      <FrameworkPill name="Next.js" color="bg-black" />
      <FrameworkPill name="Y.js" color="bg-amber-400" />
      <FrameworkPill name="Supabase" color="bg-green-400" />
      <FrameworkPill name="Remix" color="bg-indigo-400" />
      <FrameworkPill name="Astro" color="bg-orange-400" />
      <FrameworkPill name="Vite" color="bg-purple-400" />
    </div>
    <div className="animate-marquee2 absolute top-0 flex gap-6 whitespace-nowrap py-4">
      <FrameworkPill name="React" color="bg-blue-400" />
      <FrameworkPill name="Next.js" color="bg-black" />
      <FrameworkPill name="Y.js" color="bg-amber-400" />
      <FrameworkPill name="Supabase" color="bg-green-400" />
      <FrameworkPill name="Remix" color="bg-indigo-400" />
      <FrameworkPill name="Astro" color="bg-orange-400" />
      <FrameworkPill name="Vite" color="bg-purple-400" />
      {/* Duplicates */}
      <FrameworkPill name="React" color="bg-blue-400" />
      <FrameworkPill name="Next.js" color="bg-black" />
      <FrameworkPill name="Y.js" color="bg-amber-400" />
      <FrameworkPill name="Supabase" color="bg-green-400" />
      <FrameworkPill name="Remix" color="bg-indigo-400" />
      <FrameworkPill name="Astro" color="bg-orange-400" />
      <FrameworkPill name="Vite" color="bg-purple-400" />
    </div>
  </div>
);
