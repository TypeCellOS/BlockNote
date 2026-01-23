import { DemoEditor } from "./_components/DemoEditor";

export default function DemoPage() {
  return (
    <main className="flex min-h-[calc(100vh-var(--fd-nav-height)-var(--fd-footer-height))] w-full flex-col items-center justify-center bg-[#fdfbf7] p-4 sm:p-8">
      <div className="mx-auto w-full max-w-5xl text-center">
        <h1 className="mb-8 font-serif text-4xl text-stone-900 md:text-5xl">
          Try <span className="text-purple-600">BlockNote</span>
        </h1>
      </div>
      <DemoEditor />
    </main>
  );
}
