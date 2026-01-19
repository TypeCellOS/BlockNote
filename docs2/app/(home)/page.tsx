"use client"; // TODO: remove
import React, { useEffect, useRef, useState } from "react";
import { MockEditor } from "../Shared";

// --- UI Components ---

const SpotlightCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-2xl border border-stone-200 bg-white ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(168, 85, 247, 0.1), transparent 40%)`,
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
};

const FrameworkPill: React.FC<{
  name: string;
  color: string;
  icon?: React.ReactNode;
}> = ({ name, color, icon }) => (
  <div className="flex cursor-default items-center gap-2 whitespace-nowrap rounded-full border border-stone-200 bg-white/50 px-4 py-2 shadow-sm backdrop-blur-sm transition-colors hover:border-purple-200 hover:bg-white">
    {icon || <div className={`h-2 w-2 rounded-full ${color}`}></div>}
    <span className="text-sm font-medium text-stone-600">{name}</span>
  </div>
);

const Marquee: React.FC = () => (
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

const CodePlayground: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"ui" | "schema" | "backend">("ui");

  const content = {
    ui: {
      file: "Editor.tsx",
      code: `import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/react";

export default function App() {
  const editor = useCreateBlockNote({
    initialContent: [
      { type: "paragraph", content: "Hello World" }
    ]
  });

  return <BlockNoteView editor={editor} theme="light" />;
}`,
    },
    schema: {
      file: "schema.ts",
      code: `import { BlockNoteSchema } from "@blocknote/core";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    // Add custom blocks
    alert: AlertBlock,
    code: CodeBlock,
    image: ImageBlock,
  },
});

// Fully typed based on your schema
type MyBlock = typeof schema.Block;`,
    },
    backend: {
      file: "api/save.ts",
      code: `// The editor outputs clean, structured JSON
// No HTML parsing required

app.post('/save', async (req, res) => {
  const { document } = req.body;
  
  // document is Block[];
  await db.posts.update({
    where: { id: req.body.id },
    data: { content: document }
  });
});`,
    },
  };

  return (
    <div className="flex flex-col items-start gap-12 lg:flex-row">
      <div className="flex-1">
        <h2 className="mb-6 font-serif text-3xl text-stone-900 md:text-4xl">
          Designed for Control.
        </h2>
        <p className="mb-8 text-lg leading-relaxed text-stone-500">
          BlockNote is built on top of ProseMirror, but provides a modern, typed
          API that feels like native React.
        </p>

        <div className="space-y-4">
          <button
            onClick={() => setActiveTab("ui")}
            className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all duration-300 ${activeTab === "ui" ? "border-purple-200 bg-purple-50 shadow-sm" : "border-transparent bg-white hover:bg-stone-50"}`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl ${activeTab === "ui" ? "bg-purple-100 text-purple-600" : "bg-stone-100 text-stone-400"}`}
            >
              🎨
            </div>
            <div>
              <div
                className={`font-bold ${activeTab === "ui" ? "text-stone-900" : "text-stone-500"}`}
              >
                Declarative UI
              </div>
              <div className="text-xs text-stone-400">
                Standard React components for everything.
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("schema")}
            className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all duration-300 ${activeTab === "schema" ? "border-amber-200 bg-amber-50 shadow-sm" : "border-transparent bg-white hover:bg-stone-50"}`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl ${activeTab === "schema" ? "bg-amber-100 text-amber-600" : "bg-stone-100 text-stone-400"}`}
            >
              📐
            </div>
            <div>
              <div
                className={`font-bold ${activeTab === "schema" ? "text-stone-900" : "text-stone-500"}`}
              >
                Type-Safe Schema
              </div>
              <div className="text-xs text-stone-400">
                Define blocks, get TypeScript inference.
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("backend")}
            className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all duration-300 ${activeTab === "backend" ? "border-blue-200 bg-blue-50 shadow-sm" : "border-transparent bg-white hover:bg-stone-50"}`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl ${activeTab === "backend" ? "bg-blue-100 text-blue-600" : "bg-stone-100 text-stone-400"}`}
            >
              💾
            </div>
            <div>
              <div
                className={`font-bold ${activeTab === "backend" ? "text-stone-900" : "text-stone-500"}`}
              >
                Clean Data
              </div>
              <div className="text-xs text-stone-400">
                Pure JSON output, ready for your DB.
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="perspective-1000 group relative w-full flex-1">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-stone-200 to-purple-200 opacity-20 blur transition duration-1000 group-hover:opacity-40"></div>
        <div className="group-hover:rotate-y-2 relative transform overflow-hidden rounded-xl border border-white/10 bg-[#0F0F11] shadow-2xl ring-1 ring-black/5 transition-transform duration-500">
          {/* Window Chrome */}
          <div className="flex items-center justify-between border-b border-white/5 bg-[#18181B] px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F56]"></div>
              <div className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]"></div>
              <div className="h-2.5 w-2.5 rounded-full bg-[#27C93F]"></div>
            </div>
            <span className="font-mono text-xs text-stone-500">
              {content[activeTab].file}
            </span>
            <div className="w-4"></div>
          </div>

          {/* Code */}
          <div className="min-h-[300px] overflow-x-auto p-6">
            <pre className="whitespace-pre font-mono text-sm leading-relaxed text-stone-300">
              {content[activeTab].code}
            </pre>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0F0F11] to-transparent"></div>
        </div>
      </div>
    </div>
  );
};

const DataParticle: React.FC<{
  delay: number;
  x: number;
  children: React.ReactNode;
}> = ({ delay, x, children }) => (
  <div
    className="absolute whitespace-nowrap rounded border border-purple-100 bg-white/90 px-2 py-1 font-mono text-[10px] text-purple-400 shadow-sm"
    style={{
      left: `${x}%`,
      bottom: "0",
      animation: "float-up-fade 5s linear infinite",
      animationDelay: `${delay}s`,
      opacity: 0,
    }}
  >
    {children}
  </div>
);

const ArchitectureLayer: React.FC<{
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}> = ({ title, subtitle, icon, color }) => (
  <div className="group relative">
    <div
      className={`absolute inset-0 ${color} opacity-20 blur-xl transition-opacity duration-500 group-hover:opacity-30`}
    ></div>
    <div className="relative rounded-xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-4">
        <div
          className={`h-12 w-12 rounded-lg ${color.replace("bg-", "bg-").replace("blur", "bg-opacity-10")} flex items-center justify-center text-2xl`}
        >
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-stone-900">{title}</h3>
          <p className="text-sm text-stone-500">{subtitle}</p>
        </div>
      </div>
    </div>
  </div>
);

const BlockCatalogItem: React.FC<{ name: string; icon: React.ReactNode }> = ({
  name,
  icon,
}) => (
  <div className="group flex cursor-default flex-col items-center justify-center rounded-xl border border-stone-100 bg-white p-4 transition-all duration-300 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-500/5">
    <div className="mb-3 h-10 w-10 text-stone-400 transition-colors group-hover:text-purple-500">
      {icon}
    </div>
    <span className="text-xs font-medium text-stone-500 group-hover:text-stone-900">
      {name}
    </span>
  </div>
);

export default function AiNativeConcept() {
  // --- Living Editor State Machine ---
  const [editorText, setEditorText] = useState("BlockNote is a text editor.");
  const [editorTitle] = useState("The Editor that Thinks");
  const [isTyping, setIsTyping] = useState(false);
  const [aiSelection, setAiSelection] = useState(false);
  const [aiPopup, setAiPopup] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  useEffect(() => {
    let mounted = true;

    const sequence = async () => {
      if (!mounted) return;
      // 1. Initial State
      setEditorText("BlockNote is a text editor.");
      setAiSelection(false);
      setAiPopup(false);
      setAiThinking(false);
      setIsTyping(false);

      // Wait before starting
      await new Promise((r) => setTimeout(r, 2000));
      if (!mounted) return;

      // 2. Select Text
      setAiSelection(true);
      await new Promise((r) => setTimeout(r, 800));
      if (!mounted) return;

      // 3. Show Popup
      setAiPopup(true);
      await new Promise((r) => setTimeout(r, 1200));
      if (!mounted) return;

      // 4. "Click" AI Action (Thinking)
      setAiThinking(true);
      await new Promise((r) => setTimeout(r, 1500));
      if (!mounted) return;

      // 5. Replace Text (Simulate writing)
      setAiThinking(false);
      setAiPopup(false);
      setAiSelection(false);
      setEditorText("");
      setIsTyping(true);

      const newText = "BlockNote is an intelligent semantic engine.";
      for (let i = 0; i <= newText.length; i++) {
        if (!mounted) return;
        setEditorText(newText.slice(0, i));
        await new Promise((r) => setTimeout(r, 50));
      }
      setIsTyping(false);

      // 6. Loop
      await new Promise((r) => setTimeout(r, 3000));
      if (mounted) sequence(); // Recursive call to loop
    };

    sequence();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="bg-ai-bg text-ai-text font-public flex min-h-screen flex-col overflow-x-hidden selection:bg-purple-100 selection:text-purple-900">
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

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative mx-auto grid w-full max-w-7xl items-center gap-20 px-6 py-24 lg:grid-cols-2">
          {/* Passive Neural Background */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-30">
            <svg width="100%" height="100%">
              <pattern
                id="neural-pattern"
                x="0"
                y="0"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <circle
                  cx="2"
                  cy="2"
                  r="1"
                  className="text-stone-300"
                  fill="currentColor"
                />
              </pattern>
              <rect width="100%" height="100%" fill="url(#neural-pattern)" />
            </svg>
            {/* Glowing blobs */}
            <div className="animate-float absolute left-0 top-0 h-[600px] w-[600px] rounded-full bg-purple-200/20 blur-[120px]"></div>
            <div className="animate-float-delayed absolute bottom-0 right-0 h-[600px] w-[600px] rounded-full bg-amber-100/30 blur-[120px]"></div>
          </div>

          <div>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white/60 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-purple-700 backdrop-blur-sm">
              <span className="text-sm">✨</span>
              Context Aware Editing
            </div>
            <h1 className="mb-8 font-serif text-5xl leading-[1.05] tracking-tight text-stone-900 md:text-7xl">
              The editor that <br />
              <span className="ai-gradient-text pr-2 italic">
                thinks with you.
              </span>
            </h1>
            <p className="mb-10 max-w-lg text-lg font-light leading-relaxed text-stone-600 md:text-xl">
              BlockNote is the AI-native rich text editor for React. Built to
              understand context, autocomplete thoughts, and transform data
              instantly.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button className="group flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-8 py-3.5 font-medium text-stone-900 shadow-sm transition-all hover:border-purple-300 hover:shadow-lg">
                <span>Try the Demo</span>
                <span className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </button>
              <div className="flex items-center gap-2 px-4 text-sm text-stone-500">
                <span className="rounded border border-stone-200 bg-stone-100 px-2 py-1 font-mono text-xs text-stone-600">
                  npm install @blocknote/ai
                </span>
              </div>
            </div>
          </div>

          <div className="relative h-[450px]">
            {/* Living Editor Container */}
            <div
              className={`relative z-10 transition-shadow duration-1000 ${aiThinking ? "shadow-[0_0_50px_rgba(168,85,247,0.2)]" : ""}`}
              style={aiThinking ? { animation: "pulse-aura 2s infinite" } : {}}
            >
              <MockEditor
                variant="ai_native"
                title={editorTitle}
                body={editorText}
                cursorVisible={isTyping}
                aiSelection={aiSelection}
                aiPopupVisible={aiPopup}
                aiThinking={aiThinking}
              />

              {/* Data Stream Particles - Passive Visuals */}
              <div className="pointer-events-none absolute inset-x-0 -top-10 h-full overflow-visible">
                <DataParticle
                  delay={0}
                  x={10}
                >{`{ type: "text" }`}</DataParticle>
                <DataParticle
                  delay={2.5}
                  x={80}
                >{`{ sentiment: 0.9 }`}</DataParticle>
                <DataParticle
                  delay={1.2}
                  x={45}
                >{`{ "entities": ["React"] }`}</DataParticle>
                <DataParticle
                  delay={3.8}
                  x={25}
                >{`{ "tone": "formal" }`}</DataParticle>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack Marquee */}
        <section className="border-y border-stone-100 bg-stone-50/50 py-10">
          <div className="mx-auto max-w-7xl overflow-hidden">
            <div className="mb-6 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-400">
                Integrates with your stack
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
                Your content, amplified.
              </h2>
              <p className="text-lg text-stone-500">
                BlockNote isn&apos;t just a text box. It&apos;s an intelligent
                surface that connects your users&apos; thoughts to your
                application&apos;s data.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <SpotlightCard className="group p-8 shadow-xl shadow-stone-200/50">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-purple-100 bg-purple-50 text-2xl text-purple-600 transition-transform duration-500 group-hover:scale-110">
                  ⚡️
                </div>
                <h3 className="mb-3 font-serif text-2xl text-stone-900">
                  Autocomplete
                </h3>
                <p className="relative z-10 mb-6 text-stone-500">
                  Ghost text suggestions that adapt to your user&apos;s writing
                  style. Powered by your choice of LLM.
                </p>
                <div className="rounded-lg border border-stone-100 bg-stone-50 p-4 font-mono text-xs text-stone-400">
                  Typing...{" "}
                  <span className="text-purple-400">
                    suggestions appear here
                  </span>
                </div>
              </SpotlightCard>

              <SpotlightCard className="group p-8 shadow-xl shadow-stone-200/50">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-2xl text-amber-600 transition-transform duration-500 group-hover:scale-110">
                  🧠
                </div>
                <h3 className="mb-3 font-serif text-2xl text-stone-900">
                  Context Aware
                </h3>
                <p className="relative z-10 mb-6 text-stone-500">
                  Select text to rewrite, shorten, or change tone. The AI
                  understands the surrounding blocks.
                </p>
                <div className="flex justify-center gap-2 rounded-lg border border-stone-100 bg-stone-50 p-2">
                  <div className="h-2 w-2 rounded-full bg-stone-300"></div>
                  <div className="h-2 w-16 rounded-full bg-stone-200"></div>
                  <div className="h-2 w-4 rounded-full bg-amber-200"></div>
                </div>
              </SpotlightCard>

              <SpotlightCard className="group p-8 shadow-xl shadow-stone-200/50">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-2xl text-blue-600 transition-transform duration-500 group-hover:scale-110">
                  📊
                </div>
                <h3 className="mb-3 font-serif text-2xl text-stone-900">
                  Data Extraction
                </h3>
                <p className="relative z-10 mb-6 text-stone-500">
                  Turn unstructured text into structured JSON blocks.
                  Automatically convert lists to tables or tasks.
                </p>
                <div className="rounded-lg border border-stone-100 bg-stone-50 p-3 font-mono text-[10px] text-stone-400">
                  {`{ "type": "table", "content": [...] }`}
                </div>
              </SpotlightCard>
            </div>
          </div>
        </section>

        {/* Interactive Code Playground */}
        <section className="relative overflow-hidden bg-white py-32">
          {/* Decorative background for code section */}
          <div className="absolute right-0 top-0 -z-10 h-[800px] w-[800px] -translate-y-1/2 translate-x-1/2 rounded-full bg-stone-50 blur-[100px]"></div>

          <div className="mx-auto max-w-6xl px-6">
            <CodePlayground />
          </div>
        </section>

        {/* Architecture Visualizer */}
        <section className="relative overflow-hidden border-t border-stone-200 bg-stone-50 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-20 text-center">
              <h2 className="mb-6 font-serif text-4xl text-stone-900">
                Built on giants.
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-stone-500">
                We wrap the world&apos;s most robust rich-text engine
                (ProseMirror) in an API that makes sense for modern product
                development.
              </p>
            </div>

            <div className="relative">
              {/* Connecting Line */}
              <div className="absolute bottom-0 left-[50%] top-0 hidden w-px bg-stone-200 md:block"></div>
              <svg className="pointer-events-none absolute inset-0 hidden h-full w-full md:block">
                <path
                  className="animate-[flow-line_3s_linear_infinite]"
                  d="M 570 120 L 570 200"
                  stroke="#A855F7"
                  strokeWidth="2"
                  strokeDasharray="10 10"
                  fill="none"
                />
                <path
                  className="animate-[flow-line_3s_linear_infinite]"
                  d="M 570 340 L 570 420"
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeDasharray="10 10"
                  fill="none"
                />
              </svg>

              <div className="relative z-10 space-y-12 md:space-y-24">
                {/* Top Layer */}
                <div className="flex justify-center">
                  <ArchitectureLayer
                    title="Your Application"
                    subtitle="The UI your users interact with. React, Vue, Svelte."
                    icon="🎨"
                    color="bg-amber-100"
                  />
                </div>

                {/* Middle Layer */}
                <div className="flex justify-center">
                  <div className="group relative w-full max-w-xl">
                    <div className="absolute inset-0 bg-purple-500 opacity-20 blur-xl transition-opacity duration-500 group-hover:opacity-30"></div>
                    <div className="relative rounded-xl border-2 border-purple-100 bg-white p-8 shadow-xl">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-2xl font-bold text-stone-900">
                          BlockNote API
                        </h3>
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-purple-700">
                          The Core
                        </span>
                      </div>
                      <div className="mb-6 grid grid-cols-2 gap-4 text-sm text-stone-500">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                          Schema Validation
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                          Slash Menus
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                          Real-time Collab
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                          Block Logic
                        </div>
                      </div>
                      <div className="rounded border border-stone-100 bg-stone-50 p-3 font-mono text-xs text-stone-600">
                        {`const editor = useCreateBlockNote({ ... })`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Layer */}
                <div className="flex justify-center">
                  <ArchitectureLayer
                    title="ProseMirror"
                    subtitle="The battle-tested contenteditable engine used by NYT, Atlassian."
                    icon="🛡️"
                    color="bg-stone-100"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Blocks Catalog */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-16 text-center">
              <h2 className="mb-6 font-serif text-4xl text-stone-900">
                Batteries Included.
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-stone-500">
                Everything you need to build a modern document experience, right
                out of the box. No external plugins required.
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
                name="More..."
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
      </main>
    </div>
  );
}
