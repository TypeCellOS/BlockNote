"use client";

import dynamic from "next/dynamic";

// Dynamic import with ssr: false to avoid window/document access during SSR
const Editor = dynamic(() => import("./Editor"), { ssr: false });

export default function EditorPage() {
  return (
    <main>
      <h1>BlockNote Editor Test</h1>
      <div className="editor-wrapper">
        <Editor />
      </div>
    </main>
  );
}
