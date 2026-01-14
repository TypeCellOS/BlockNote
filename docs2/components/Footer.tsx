import { Logo } from "@/app/Shared";

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-50 px-6 py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 md:grid-cols-4">
        <div className="col-span-2">
          <div className="mb-6 flex items-center gap-2">
            <div className="text-black">
              <Logo className="h-5 w-5" />
            </div>
            <span className="font-serif text-lg font-medium">BlockNote</span>
          </div>
          <p className="mb-8 max-w-xs text-sm text-stone-500">
            The intelligent block editor for the modern web. Open source and
            designed for the future of work.
          </p>
          <div className="flex gap-4">
            <a
              href="https://twitter.com/TypeCellOS"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white transition-colors hover:border-black"
            >
              𝕏
            </a>
            <a
              href="https://github.com/TypeCellOS/BlockNote"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white transition-colors hover:border-black"
            >
              GH
            </a>
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold text-stone-900">Product</h4>
          <ul className="space-y-3 text-sm text-stone-600">
            <li>
              <a href="#" className="hover:text-black">
                AI Features
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-black">
                Collaboration
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-black">
                Enterprise
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold text-stone-900">Resources</h4>
          <ul className="space-y-3 text-sm text-stone-600">
            <li>
              <a href="/docs" className="hover:text-black">
                Documentation
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-black">
                API Reference
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-black">
                Examples
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-16 flex max-w-7xl items-center justify-between border-t border-stone-200 pt-8 font-mono text-xs text-stone-400">
        <p>© 2024 BLOCKNOTE INC.</p>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500"></span>
          <span>ALL SYSTEMS OPERATIONAL</span>
        </div>
      </div>
    </footer>
  );
}
