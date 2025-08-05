"use client";

import { baseOptions } from "@/app/layout.config";
import { Footer } from "@/components/Footer";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FaBook, FaCode, FaSearch } from "react-icons/fa";

interface SearchResult {
  id: string;
  type: "page" | "heading" | "text";
  content: string;
  url: string;
}

// Fallback popular pages when search doesn't return results
const fallbackPages: SearchResult[] = [
  {
    id: "/docs/getting-started",
    type: "page",
    content: "Getting Started",
    url: "/docs/getting-started",
  },
  {
    id: "/docs/install",
    type: "page",
    content: "Installation",
    url: "/docs/install",
  },
  {
    id: "/examples/01-basic/01-minimal",
    type: "page",
    content: "Basic Example",
    url: "/examples/01-basic/01-minimal",
  },
  {
    id: "/docs/react/components",
    type: "page",
    content: "React Components",
    url: "/docs/react/components",
  },
  {
    id: "/docs/foundations/document-structure",
    type: "page",
    content: "Document Structure",
    url: "/docs/foundations/document-structure",
  },
  {
    id: "/docs/features/ai",
    type: "page",
    content: "AI Features",
    url: "/docs/features/ai",
  },
];

export default function NotFound() {
  const pathname = usePathname();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const searchSimilarPages = async () => {
      try {
        const pathSegments = (pathname ?? "").split("/").filter(Boolean);
        const searchTerms = pathSegments.slice(-2).join(" ");

        if (!searchTerms) {
          throw new Error("No search terms");
        }

        const response = await fetch(
          `/api/search?query=${encodeURIComponent(searchTerms)}`,
        );
        const data = await response.json();

        const pageResults = data
          .filter((item: SearchResult) => item.type === "page")
          .slice(0, 8);

        setSearchResults(pageResults.length > 0 ? pageResults : fallbackPages);
      } catch (error) {
        setSearchResults(fallbackPages);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(searchSimilarPages, 100);
    return () => clearTimeout(timer);
  }, [pathname]);

  const useFallback =
    searchResults.length === 0 || searchResults === fallbackPages;

  return (
    <>
      <HomeLayout {...baseOptions}>
        <div className="mx-auto max-w-4xl pt-8">
          {/* 404 Header */}
          <div className="mb-12 text-center">
            <div className="mb-6 text-8xl font-bold text-gray-200 dark:text-gray-700">
              404
            </div>
            <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white">
              Page Not Found
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-gray-600 dark:text-gray-300">
              We couldn't find the page you're looking for, but here are some
              pages that might help:
            </p>
          </div>

          {/* Search Results */}
          <div className="mb-12">
            {isLoading ? (
              <div className="flex items-center justify-center space-x-3 py-12 text-gray-600 dark:text-gray-400">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <span className="text-lg">Searching for similar pages...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-6">
                <h2 className="mb-8 text-center text-2xl font-semibold text-gray-900 dark:text-white">
                  {useFallback ? "Popular Pages" : "Similar Pages"}
                </h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {searchResults.map((result, index) => (
                    <Link
                      key={index}
                      href={result.url}
                      className="group block rounded-lg border border-gray-200 bg-white p-4 text-left transition-all duration-200 hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {result.url.includes("/docs") ? (
                            <FaBook className="h-5 w-5 text-blue-600 group-hover:text-blue-700" />
                          ) : result.url.includes("/examples") ? (
                            <FaCode className="h-5 w-5 text-green-600 group-hover:text-green-700" />
                          ) : (
                            <FaSearch className="h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-medium text-gray-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                            {result.content}
                          </h3>
                          <p className="mt-1 font-mono text-sm text-gray-400 dark:text-gray-500">
                            {result.url}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-600 dark:text-gray-400">
                <p className="text-lg">
                  No similar pages found. Try searching or browsing our
                  documentation.
                </p>
              </div>
            )}
          </div>
        </div>
      </HomeLayout>
      <Footer />
    </>
  );
}
